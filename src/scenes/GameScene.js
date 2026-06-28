import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../config.js';
import { ENEMIES, TOWERS } from '../data/content.js';
import { MAPS } from '../data/maps.js';
import { buildPath, posAt } from '../path.js';
import { Sfx, Bgm } from '../audio.js';

// 深度（描画/入力の重なり順）
const DEPTH = {
  road: 0, range: 1, slot: 2, tower: 4, enemy: 5, hpbar: 6, proj: 7,
  fx: 8, hud: 20, panelBack: 30, panel: 31, end: 40,
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    const enemyFrames = ['walk_1', 'walk_2', 'walk_3', 'walk_4', 'idle', 'hurt', 'dead_1', 'dead_2'];
    for (const t of ['grunt', 'runner', 'brute', 'boss', 'subashikko', 'zombie']) {
      for (const f of enemyFrames) {
        this.load.image(`${t}_${f}`, `assets/sprites/enemies/${t}/${f}.png`);
      }
    }
    const towerFrames = ['idle', 'attack_1', 'attack_2', 'attack_3', 'attack_4', 'return_1', 'return_2', 'idle_alt'];
    for (const t of ['guard', 'soba', 'sniper', 'receptionist']) {
      for (const f of towerFrames) {
        this.load.image(`${t}_${f}`, `assets/sprites/towers/${t}/${f}.png`);
      }
    }
    this.load.image('bg_jyutakugai', 'assets/backgrounds/jyutakugai.png');
    this.load.image('bg_shotengai', 'assets/backgrounds/shotengai.png');
  }

  create() {
    // ── マップ選択（restart時に {mapIndex} で受け取る）──
    const data = this.scene.settings.data || {};
    this.mapIndex = Math.min(data.mapIndex || 0, MAPS.length - 1);
    this.map = MAPS[this.mapIndex];
    this.waves = this.map.waves;

    // ── 状態を毎回まっさらに（restartで再create）──
    this.path = buildPath(this.map.path);
    this.money = this.map.startMoney;
    this.lives = this.map.startLives;
    this.waveStartedCount = 0; // これまでに開始したウェーブ数
    this.waveActive = false;
    this.gameOver = false;
    this.awaitingNext = false;  // マップクリア後、次マップ待ち（updateを止める）

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];

    this.spawnQueue = [];
    this.spawnAccum = 0;

    this.panelItems = [];
    this.rangePreview = null;
    this.currentPanel = null;   // { type:'build', spot } or { type:'tower', tower }
    this._panelRefreshing = false;
    this.panelDirty = false;

    this.gameSpeed = 1;   // 1x / 2x
    this.paused = false;

    this.drawBoard();
    this.buildHud();
  }

  // ── 盤面（道・設置スロット）を描く ─────────────────────────
  drawBoard() {
    if (this.map.bgKey) {
      this.add.image(GAME_W / 2, GAME_H / 2, `bg_${this.map.bgKey}`)
        .setDisplaySize(GAME_W, GAME_H).setDepth(DEPTH.road - 1);
    }
    const path = this.map.path;
    const roadWidth = this.map.roadWidth;
    const g = this.add.graphics().setDepth(DEPTH.road);
    // 背景画像がある場合は道の描画をスキップ（背景の道をそのまま使う）
    if (!this.map.bgKey) {
      g.lineStyle(roadWidth, COLORS.road, 1);
      g.beginPath();
      g.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
      g.strokePath();
      g.lineStyle(2, COLORS.roadEdge, 0.8);
      g.beginPath();
      g.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
      g.strokePath();
    }

    // ゴールマーカー：ここに敵が着くとライフが減る
    const end = path[path.length - 1];
    const ex = end[0] < 0 ? end[0] + 36 : end[0] - 24; // 画面外端でも見えるよう内側に寄せる
    this.add.rectangle(ex, end[1], 10, roadWidth + 16, 0xff6b6b, 0.6).setDepth(DEPTH.road);
    this.add.text(ex - 4, end[1] - roadWidth, '🏠', { fontSize: '28px' })
      .setOrigin(0.5).setDepth(DEPTH.road);

    // スタート矢印
    this.add.text(40, path[0][1] - 38, '敵→', { fontSize: '20px', color: COLORS.text })
      .setOrigin(0.5).setDepth(DEPTH.road);

    // 設置スロット
    this.spots = this.map.spots.map((s) => {
      const pad = this.add.circle(s.x, s.y, 24, COLORS.slot)
        .setStrokeStyle(2, COLORS.slotHover, 0.9)
        .setDepth(DEPTH.slot)
        .setInteractive({ useHandCursor: true });
      const plus = this.add.text(s.x, s.y, '＋', { fontSize: '22px', color: '#9fb3c8' })
        .setOrigin(0.5).setDepth(DEPTH.slot);
      const spot = { x: s.x, y: s.y, pad, plus, tower: null };
      pad.on('pointerover', () => { if (!spot.tower) pad.setFillStyle(COLORS.slotHover); });
      pad.on('pointerout', () => { if (!spot.tower) pad.setFillStyle(COLORS.slot); });
      pad.on('pointerdown', (p, x, y, ev) => {
        if (ev) ev.stopPropagation();
        if (this.gameOver || this.awaitingNext) return;
        Sfx.resume();
        if (spot.tower) this.openTowerMenu(spot.tower);
        else this.openBuildMenu(spot);
      });
      return spot;
    });
  }

  // ── HUD（お金・ライフ・ウェーブ・開始ボタン）──────────────
  buildHud() {
    this.add.rectangle(0, 0, GAME_W, 46, 0x16202c, 0.85)
      .setOrigin(0, 0).setDepth(DEPTH.hud - 1);

    const pad = { top: 10 };  // Phaser3日本語グリフ上端クリッピング対策
    const st = { fontSize: '22px', fontStyle: 'bold', padding: pad };
    this.moneyText = this.add.text(20, 11, '', { ...st, color: COLORS.money }).setDepth(DEPTH.hud);
    this.livesText = this.add.text(210, 11, '', { ...st, color: COLORS.lives }).setDepth(DEPTH.hud);
    this.waveText = this.add.text(400, 11, '', { ...st, color: COLORS.text }).setDepth(DEPTH.hud);

    this.hintText = this.add.text(GAME_W / 2, GAME_H - 26,
      'スロット（＋）→タワー建設／タワーをクリック→強化・売却　右上＝速度・一時停止・音', {
        fontSize: '17px', color: '#9fb3c8', padding: pad,
      }).setOrigin(0.5).setDepth(DEPTH.hud);

    // 右側コントロール（速度・一時停止・ミュート）
    this.speedBtn = this.makeIconButton(GAME_W - 36, '1x', () => this.toggleSpeed());
    this.pauseBtn = this.makeIconButton(GAME_W - 74, '⏸', () => this.togglePause());
    this.muteBtn = this.makeIconButton(GAME_W - 112, '🔊', () => this.toggleMute());

    // ウェーブ開始ボタン（コントロールの左）
    this.waveBtnRect = this.add.rectangle(GAME_W - 250, 23, 240, 34, 0x2e7d4f)
      .setStrokeStyle(2, 0x57c98a).setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    this.waveBtnText = this.add.text(GAME_W - 250, 23, '', {
      fontSize: '18px', fontStyle: 'bold', color: '#ffffff', padding: pad,
    }).setOrigin(0.5).setDepth(DEPTH.hud);
    this.waveBtnRect.on('pointerover', () => this.waveBtnRect.setFillStyle(0x39A05f));
    this.waveBtnRect.on('pointerout', () => this.waveBtnRect.setFillStyle(0x2e7d4f));
    this.waveBtnRect.on('pointerdown', () => { Sfx.resume(); this.startWave(); });

    this.updateHud();
    this.refreshWaveButton();
  }

  makeIconButton(cx, label, cb) {
    const rect = this.add.rectangle(cx, 23, 32, 32, 0x2f3e52)
      .setStrokeStyle(2, 0x4a6076).setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(cx, 23, label, { fontSize: '16px', color: COLORS.text, padding: { top: 8 } })
      .setOrigin(0.5).setDepth(DEPTH.hud);
    rect.on('pointerover', () => rect.setFillStyle(0x4a6076));
    rect.on('pointerout', () => rect.setFillStyle(0x2f3e52));
    rect.on('pointerdown', () => { Sfx.resume(); cb(); });
    return { rect, text };
  }

  toggleSpeed() {
    this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
    this.speedBtn.text.setText(`${this.gameSpeed}x`);
  }

  togglePause() {
    this.paused = !this.paused;
    this.pauseBtn.text.setText(this.paused ? '▶' : '⏸');
  }

  toggleMute() {
    const m = !Sfx.isMuted();
    Sfx.setMuted(m);
    this.muteBtn.text.setText(m ? '🔇' : '🔊');
  }

  updateHud() {
    this.moneyText.setText(`💰 ${this.money}`);
    this.livesText.setText(`❤ ${this.lives}`);
    const mapLabel = `🗺 ${this.map.name}(${this.mapIndex + 1}/${MAPS.length})`;
    this.waveText.setText(`${mapLabel}  ウェーブ ${Math.min(this.waveStartedCount, this.waves.length)}/${this.waves.length}`);
    if (this.currentPanel) this.panelDirty = true;
  }

  refreshWaveButton() {
    const canStart = !this.gameOver && !this.awaitingNext
      && this.waveStartedCount < this.waves.length;
    this.waveBtnRect.setVisible(canStart);
    this.waveBtnText.setVisible(canStart);
    if (canStart) {
      const nextNum = this.waveStartedCount + 1;
      if (this.waveStartedCount === 0) {
        this.waveBtnText.setText('ウェーブ開始 ▶');
      } else if (this.waveActive) {
        this.waveBtnText.setText(`Wave ${nextNum} 早送り ▶`);
      } else {
        this.waveBtnText.setText(`Wave ${nextNum} 開始 ▶`);
      }
      this.waveBtnRect.setInteractive({ useHandCursor: true });
    } else {
      this.waveBtnRect.disableInteractive();
    }
  }

  flashColor(textObj, baseColor) {
    textObj.setColor('#ffffff');
    this.time.delayedCall(180, () => textObj.setColor(baseColor));
  }

  // ── ウェーブ開始・完了 ───────────────────────────────────
  startWave() {
    if (this.gameOver || this.awaitingNext || this.waveStartedCount >= this.waves.length) return;
    const wave = this.waves[this.waveStartedCount];
    const entries = [];
    for (const group of wave) {
      for (let i = 0; i < group.count; i++) entries.push({ type: group.type, delay: group.gap });
    }
    // キューが空のときだけ最初の敵を早出し（上乗せ時は継続間隔のまま）
    if (this.spawnQueue.length === 0 && entries.length) entries[0].delay = 350;
    this.spawnQueue.push(...entries);
    this.waveActive = true;
    this.waveStartedCount += 1;
    this.updateHud();
    this.refreshWaveButton();
    this.closePanel();
    Sfx.wave();
    Bgm.play(); // 初回のみ開始、以降はno-op
  }

  onWaveComplete() {
    this.waveActive = false;
    if (this.waveStartedCount >= this.waves.length) {
      // このマップのウェーブを全て耐えきった
      if (this.mapIndex >= MAPS.length - 1) this.showEnd(true);  // 最終マップ＝ゲームクリア
      else this.showMapClear();                                  // 次マップへ
      return;
    }
    const w = this.waveStartedCount;
    const bonus = w % 10 === 0 ? 50 : (w % 5 === 0 ? 25 : 12);
    this.money += bonus;
    this.floatText(GAME_W / 2, 90, `ウェーブ突破！ +$${bonus}`, '#ffd866', 26);
    this.updateHud();
    this.refreshWaveButton();
  }

  showMapClear() {
    this.awaitingNext = true;
    this.closePanel();
    this.refreshWaveButton();
    Bgm.stop();
    Sfx.win();

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0f16, 0.7)
      .setOrigin(0, 0).setDepth(DEPTH.end);
    this.add.text(GAME_W / 2, GAME_H / 2 - 70, `${this.map.name} クリア！`, {
      fontSize: '56px', fontStyle: 'bold', color: '#57c98a',
    }).setOrigin(0.5).setDepth(DEPTH.end);
    this.add.text(GAME_W / 2, GAME_H / 2 - 6, `次は「${MAPS[this.mapIndex + 1].name}」`, {
      fontSize: '24px', color: COLORS.text,
    }).setOrigin(0.5).setDepth(DEPTH.end);

    const nb = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 70, 240, 56, 0x2e7d4f)
      .setStrokeStyle(2, 0x57c98a).setDepth(DEPTH.end)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_W / 2, GAME_H / 2 + 70, '次のマップへ ▶', {
      fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(DEPTH.end);
    nb.on('pointerover', () => nb.setFillStyle(0x39a05f));
    nb.on('pointerout', () => nb.setFillStyle(0x2e7d4f));
    nb.on('pointerdown', () => { Sfx.resume(); this.scene.restart({ mapIndex: this.mapIndex + 1 }); });
  }

  // ── 敵 ───────────────────────────────────────────────────
  spawnEnemy(type, startDist = 0) {
    const def = ENEMIES[type];
    const pos = posAt(this.path, startDist);
    const barW = Math.max(24, def.size);

    const SPRITE_TYPES = new Set(['grunt', 'runner', 'brute', 'boss', 'subashikko', 'zombie']);
    const hasSprite = SPRITE_TYPES.has(type);
    let body, face;
    const spriteScale = def.size / 40;
    const barYOff = hasSprite ? (128 * spriteScale) / 2 + 5 : def.size / 2 + 9;

    if (hasSprite) {
      body = this.add.image(pos.x, pos.y, `${type}_walk_1`)
        .setScale(spriteScale).setDepth(DEPTH.enemy);
      face = null;
    } else {
      body = this.add.rectangle(pos.x, pos.y, def.size, def.size, def.color)
        .setStrokeStyle(2, 0x10161f, 0.6).setDepth(DEPTH.enemy);
      face = this.add.text(pos.x, pos.y, '••', { fontSize: `${Math.round(def.size * 0.5)}px`, color: '#10161f' })
        .setOrigin(0.5).setDepth(DEPTH.enemy);
    }

    const hpBg = this.add.rectangle(pos.x - barW / 2, pos.y - barYOff, barW, 5, 0x10161f, 0.7)
      .setOrigin(0, 0.5).setDepth(DEPTH.hpbar);
    const hpFill = this.add.rectangle(pos.x - barW / 2, pos.y - barYOff, barW, 5, 0x57c98a)
      .setOrigin(0, 0.5).setDepth(DEPTH.hpbar);

    this.enemies.push({
      type, def, speed: def.speed, dist: startDist, hp: def.hp, maxHp: def.hp,
      x: pos.x, y: pos.y, alive: true, barW, body, face, hpBg, hpFill,
      hasSprite, animTimer: 0, animFrame: 0, barYOff,
    });
  }

  damageEnemy(enemy, dmg) {
    if (!enemy.alive) return;
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.money += enemy.def.reward;
      this.updateHud();
      this.floatText(enemy.x, enemy.y - 10, `+$${enemy.def.reward}`, '#ffd866', 16);
      if (enemy.def.splits) {
        this.spawnEnemy('grunt', enemy.dist);
        this.spawnEnemy('grunt', enemy.dist);
      }
      this.destroyEnemyGfx(enemy);
      Sfx.kill();
    } else {
      enemy.hpFill.scaleX = Math.max(0, enemy.hp / enemy.maxHp);
      Sfx.hit();
    }
  }

  charmEnemy(enemy, p) {
    if (!enemy.alive) return;
    enemy.slowMult = p.slowMult;
    enemy.slowTimer = p.slowDuration;
    if (enemy.hasSprite) enemy.body.setTint(0xff69b4);
    else enemy.body.setFillStyle(0xff69b4);
    this.floatText(enemy.x, enemy.y - 14, '💕', '#ff69b4', 18);
  }

  destroyEnemyGfx(enemy) {
    enemy.body.destroy();
    if (enemy.face) enemy.face.destroy();
    enemy.hpBg.destroy();
    enemy.hpFill.destroy();
  }

  // ── タワー ──────────────────────────────────────────────
  buildTower(spot, towerKey) {
    const def = TOWERS[towerKey];
    if (this.money < def.cost) { this.flashColor(this.moneyText, COLORS.money); return; }
    this.money -= def.cost;
    this.updateHud();

    spot.pad.setFillStyle(def.color);
    spot.plus.setText('');
    const sprite = this.add.image(spot.x, spot.y, `${towerKey}_idle`)
      .setScale(0.85).setOrigin(0.5, 0.5).setDepth(DEPTH.tower);

    const tower = {
      key: towerKey, def, kind: def.kind, x: spot.x, y: spot.y,
      level: 1, range: def.range, damage: def.damage, splash: def.splash,
      fireRate: def.fireRate, cd: 0, invested: def.cost, sprite, spot,
      shots: def.shots || 1,
      animState: 'idle', animTimer: 0,
    };
    spot.tower = tower;
    this.towers.push(tower);
    Sfx.build();
    this.closePanel();
  }

  sellValueOf(tower) {
    return Math.floor(tower.invested * 0.6); // 投資額の60%を払い戻し
  }

  sellTower(tower) {
    const refund = this.sellValueOf(tower);
    this.money += refund;
    this.updateHud();
    this.floatText(tower.x, tower.y - 24, `+$${refund}`, '#ffd866', 16);
    // スロットを空に戻す
    const spot = tower.spot;
    spot.tower = null;
    spot.pad.setFillStyle(COLORS.slot);
    spot.plus.setText('＋');
    tower.sprite.destroy();
    this.towers = this.towers.filter((t) => t !== tower);
    Sfx.sell();
    this.closePanel();
  }

  upgradeCostOf(tower) {
    return Math.round(tower.def.up.cost * tower.level);
  }

  upgradeTower(tower) {
    if (tower.level >= tower.def.maxLevel) return;
    const cost = this.upgradeCostOf(tower);
    if (this.money < cost) { this.flashColor(this.moneyText, COLORS.money); return; }
    this.money -= cost;
    tower.level += 1;
    tower.damage += tower.def.up.damage;
    tower.range += tower.def.up.range;
    tower.splash += tower.def.up.splash;
    tower.shots += tower.def.up.shots || 0;
    tower.invested += cost;
    // 5レベルごとに色が変わる（Lv1-5=白 / Lv6-10=金 / Lv11-15=赤）
    const TIER_TINTS = [0xffffff, 0xffcc00, 0xff3333];
    const tier = Math.ceil(tower.level / 5) - 1; // 0/1/2
    tower.sprite.setTint(TIER_TINTS[tier] ?? 0xff3333);
    this.updateHud();
    this.floatText(tower.x, tower.y - 24, 'UP!', '#9ad0ff', 18);
    Sfx.upgrade();
    this.closePanel();
  }

  findTarget(tower) {
    // 射程内で「最も先に進んでいる敵（＝ゴールに近い＝漏れそうな敵）」を狙う
    let best = null;
    let bestDist = -1;
    const r2 = tower.range * tower.range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - tower.x;
      const dy = e.y - tower.y;
      if (dx * dx + dy * dy <= r2 && e.dist > bestDist) {
        best = e;
        bestDist = e.dist;
      }
    }
    return best;
  }

  findTargets(tower, count) {
    const r2 = tower.range * tower.range;
    const inRange = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - tower.x, dy = e.y - tower.y;
      if (dx * dx + dy * dy <= r2) inRange.push(e);
    }
    inRange.sort((a, b) => b.dist - a.dist);
    return inRange.slice(0, count);
  }

  fireTower(tower, target) {
    const def = tower.def;
    const lv = tower.level - 1;
    const projColor = def.projColors ? def.projColors[lv] : (def.projColor || 0xffffff);
    const projSize  = def.projSizes  ? def.projSizes[lv]  : (tower.kind === 'splash' ? 7 : 5);
    const go = this.add.circle(tower.x, tower.y - 14, projSize, projColor)
      .setDepth(DEPTH.proj);
    this.projectiles.push({
      x: tower.x, y: tower.y - 14, target,
      speed: def.projSpeed, damage: tower.damage, splash: tower.splash,
      kind: def.kind,
      slowMult: def.slowMult || 1, slowDuration: def.slowDuration || 0,
      color: projColor, life: 0, go,
    });
    tower.animState = 'attack';
    tower.animTimer = 0;
    Sfx.fire();
  }

  // ── 弾 ──────────────────────────────────────────────────
  updateProjectile(p, dt) {
    p.life += dt;
    const target = p.target;
    const targetGone = !target || !target.alive;

    if (targetGone) {
      // 単体弾は失探で消滅。範囲弾はその場で炸裂。
      if (p.splash > 0) this.explode(p);
      this.killProjectile(p);
      return;
    }

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    const hitR = target.def.size / 2 + 6;

    if (d <= hitR || d <= step) {
      // 着弾
      p.x = target.x; p.y = target.y;
      if (p.splash > 0) this.explode(p);
      else if (p.kind === 'charm') this.charmEnemy(target, p);
      else this.damageEnemy(target, p.damage);
      this.killProjectile(p);
      return;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    p.go.setPosition(p.x, p.y);

    if (p.life > 2.5) this.killProjectile(p); // 保険：寿命切れ
  }

  explode(p) {
    const r2 = p.splash * p.splash;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy <= r2) this.damageEnemy(e, p.damage);
    }
    const ring = this.add.circle(p.x, p.y, p.splash, p.color, 0.25)
      .setStrokeStyle(2, p.color, 0.9).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: ring, alpha: 0, scale: 1.15, duration: 220,
      onComplete: () => ring.destroy(),
    });
    Sfx.explode();
  }

  killProjectile(p) {
    if (p.dead) return;
    p.dead = true;
    p.go.destroy();
  }

  // ── 浮かぶテキスト（フィードバック）─────────────────────
  floatText(x, y, str, color, size) {
    const t = this.add.text(x, y, str, { fontSize: `${size}px`, fontStyle: 'bold', color })
      .setOrigin(0.5).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: t, y: y - 28, alpha: 0, duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  // ── 建設メニュー / 強化メニュー ───────────────────────────
  refreshPanel() {
    if (this._panelRefreshing || !this.currentPanel) return;
    this._panelRefreshing = true;
    const { type, spot, tower } = this.currentPanel;
    if (type === 'build') this.openBuildMenu(spot);
    else if (type === 'tower') this.openTowerMenu(tower);
    this._panelRefreshing = false;
  }

  openBuildMenu(spot) {
    this.closePanel();
    this.currentPanel = { type: 'build', spot };
    this.showRangePreview(spot.x, spot.y, TOWERS.guard.range); // 目安として警備員射程
    const w = 240;
    const x = Phaser.Math.Clamp(spot.x, w / 2 + 10, GAME_W - w / 2 - 10);
    const y = Phaser.Math.Clamp(spot.y < GAME_H / 2 ? spot.y + 130 : spot.y - 130, 145, GAME_H - 145);
    this.makeBackdrop();
    this.addPanelItem(this.add.rectangle(x, y, w, 268, 0x16202c, 0.96)
      .setStrokeStyle(2, 0x4a6076).setDepth(DEPTH.panel));
    this.addPanelItem(this.add.text(x, y - 108, 'タワーを建てる', {
      fontSize: '18px', fontStyle: 'bold', color: COLORS.text,
      padding: { top: 10, bottom: 2 },
    }).setOrigin(0.5).setDepth(DEPTH.panel));

    this.makeButton(x, y - 64, w - 24, 44, TOWERS.guard.color,
      `係長（単体）  $${TOWERS.guard.cost}`,
      `射程${TOWERS.guard.range} / 威力${TOWERS.guard.damage} ／ 係長→部長`,
      this.money >= TOWERS.guard.cost,
      () => this.buildTower(spot, 'guard'));

    this.makeButton(x, y - 12, w - 24, 44, TOWERS.soba.color,
      `ゆとり社員  $${TOWERS.soba.cost}`,
      `書類投げ（範囲） / 威力${TOWERS.soba.damage}`,
      this.money >= TOWERS.soba.cost,
      () => this.buildTower(spot, 'soba'));

    this.makeButton(x, y + 40, w - 24, 44, TOWERS.sniper.color,
      `警備員（遠距離）  $${TOWERS.sniper.cost}`,
      `射程${TOWERS.sniper.range} / 威力${TOWERS.sniper.damage}`,
      this.money >= TOWERS.sniper.cost,
      () => this.buildTower(spot, 'sniper'));

    this.makeButton(x, y + 92, w - 24, 44, TOWERS.receptionist.color,
      `受付嬢（混乱）  $${TOWERS.receptionist.cost}`,
      `ハートでスロー / 射程${TOWERS.receptionist.range}`,
      this.money >= TOWERS.receptionist.cost,
      () => this.buildTower(spot, 'receptionist'));
  }

  openTowerMenu(tower) {
    this.closePanel();
    this.currentPanel = { type: 'tower', tower };
    this.showRangePreview(tower.x, tower.y, tower.range);
    const w = 240;
    const x = Phaser.Math.Clamp(tower.x, w / 2 + 10, GAME_W - w / 2 - 10);
    const y = Phaser.Math.Clamp(tower.y < GAME_H / 2 ? tower.y + 120 : tower.y - 120, 120, GAME_H - 120);
    const maxed = tower.level >= tower.def.maxLevel;
    const cost = this.upgradeCostOf(tower);

    const rankName = tower.def.levelNames
      ? tower.def.levelNames[tower.level - 1]
      : tower.def.name;
    const nextRank = tower.def.levelNames ? tower.def.levelNames[tower.level] : null;

    this.makeBackdrop();
    this.addPanelItem(this.add.rectangle(x, y, w, 196, 0x16202c, 0.96)
      .setStrokeStyle(2, 0x4a6076).setDepth(DEPTH.panel));
    this.addPanelItem(this.add.text(x, y - 78, `${rankName}  Lv${tower.level}`, {
      fontSize: '18px', fontStyle: 'bold', color: COLORS.text,
      padding: { top: 10, bottom: 2 },
    }).setOrigin(0.5).setDepth(DEPTH.panel));
    this.addPanelItem(this.add.text(x, y - 50,
      `射程 ${tower.range}  /  威力 ${tower.damage}${tower.splash > 0 ? `  /  範囲 ${tower.splash}` : ''}`, {
        fontSize: '14px', color: '#9fb3c8',
        padding: { top: 8 },
      }).setOrigin(0.5).setDepth(DEPTH.panel));

    if (maxed) {
      this.addPanelItem(this.add.text(x, y - 8, 'MAX レベル', {
        fontSize: '18px', fontStyle: 'bold', color: '#ffd866',
        padding: { top: 10, bottom: 2 },
      }).setOrigin(0.5).setDepth(DEPTH.panel));
    } else {
      const upLabel = nextRank
        ? `強化 → ${nextRank}  $${cost}`
        : `強化 → Lv${tower.level + 1}   $${cost}`;
      this.makeButton(x, y - 6, w - 24, 44, 0x2f6fb0,
        upLabel,
        `威力+${tower.def.up.damage} / 射程+${tower.def.up.range}`,
        this.money >= cost,
        () => this.upgradeTower(tower));
    }

    this.makeButton(x, y + 50, w - 24, 38, 0x7a4a4a,
      `売却  +$${this.sellValueOf(tower)}`, null, true,
      () => this.sellTower(tower));
  }

  makeBackdrop() {
    const back = this.add.zone(0, 0, GAME_W, GAME_H).setOrigin(0, 0)
      .setDepth(DEPTH.panelBack).setInteractive();
    back.on('pointerdown', () => this.closePanel());
    this.addPanelItem(back);
  }

  makeButton(cx, cy, w, h, color, label, sub, enabled, cb) {
    const rect = this.add.rectangle(cx, cy, w, h, color, enabled ? 1 : 0.35)
      .setStrokeStyle(2, 0x10161f, 0.6).setDepth(DEPTH.panel);
    const t1 = this.add.text(cx, cy - (sub ? 8 : 0), label, {
      fontSize: '16px', fontStyle: 'bold', color: enabled ? '#ffffff' : '#cfd8e3',
      padding: { top: 10, bottom: 2 },
    }).setOrigin(0.5).setDepth(DEPTH.panel);
    this.addPanelItem(rect);
    this.addPanelItem(t1);
    if (sub) {
      this.addPanelItem(this.add.text(cx, cy + 12, sub, {
        fontSize: '12px', color: enabled ? '#e8f0f8' : '#9fb3c8',
        padding: { top: 8 },
      }).setOrigin(0.5).setDepth(DEPTH.panel));
    }
    if (enabled) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerover', () => rect.setFillStyle(color, 0.85));
      rect.on('pointerout', () => rect.setFillStyle(color, 1));
      rect.on('pointerdown', (p, x, y, ev) => { if (ev) ev.stopPropagation(); cb(); });
    }
  }

  addPanelItem(obj) {
    this.panelItems.push(obj);
  }

  closePanel() {
    for (const o of this.panelItems) o.destroy();
    this.panelItems = [];
    if (this.rangePreview) { this.rangePreview.destroy(); this.rangePreview = null; }
    this.currentPanel = null;
    this.panelDirty = false;
  }

  showRangePreview(x, y, range) {
    if (this.rangePreview) this.rangePreview.destroy();
    this.rangePreview = this.add.circle(x, y, range, COLORS.rangePreview, 0.08)
      .setStrokeStyle(2, COLORS.rangePreview, 0.8).setDepth(DEPTH.range);
  }

  // ── 終了画面 ─────────────────────────────────────────────
  showEnd(win) {
    this.gameOver = true;
    this.waveActive = false;
    this.closePanel();
    this.refreshWaveButton();
    Bgm.stop();
    if (win) Sfx.win(); else Sfx.lose();

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0f16, 0.72)
      .setOrigin(0, 0).setDepth(DEPTH.end);
    this.add.text(GAME_W / 2, GAME_H / 2 - 70, win ? 'ゲームクリア！' : 'ゲームオーバー', {
      fontSize: '64px', fontStyle: 'bold', color: win ? '#57c98a' : '#ff6b6b',
    }).setOrigin(0.5).setDepth(DEPTH.end);
    this.add.text(GAME_W / 2, GAME_H / 2 - 6, win
      ? `全${MAPS.length}マップを守りきった！`
      : `ライフ0… ${this.map.name} ウェーブ ${this.waveStartedCount}/${this.waves.length} で陥落`, {
      fontSize: '24px', color: COLORS.text,
    }).setOrigin(0.5).setDepth(DEPTH.end);

    // 勝ち＝最初から / 負け＝同じマップをやり直し
    const retryMap = win ? 0 : this.mapIndex;
    const rb = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 70, 220, 56, 0x2e7d4f)
      .setStrokeStyle(2, 0x57c98a).setDepth(DEPTH.end)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_W / 2, GAME_H / 2 + 70, win ? 'もう一度 ↻' : 'リトライ ↻', {
      fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(DEPTH.end);
    rb.on('pointerover', () => rb.setFillStyle(0x39a05f));
    rb.on('pointerout', () => rb.setFillStyle(0x2e7d4f));
    rb.on('pointerdown', () => { Sfx.resume(); this.scene.restart({ mapIndex: retryMap }); });
  }

  // ── メインループ ─────────────────────────────────────────
  update(time, delta) {
    if (this.gameOver || this.paused || this.awaitingNext) return;
    const d = delta * this.gameSpeed;            // 速度倍率（1x/2x）
    const dt = Math.min(d, 50) / 1000;           // 秒（大ジャンプを抑制）

    // 1) 敵スポーン
    if (this.waveActive && this.spawnQueue.length) {
      this.spawnAccum += d;
      while (this.spawnQueue.length && this.spawnAccum >= this.spawnQueue[0].delay) {
        this.spawnAccum -= this.spawnQueue[0].delay;
        this.spawnEnemy(this.spawnQueue.shift().type);
      }
    }

    // 2) 敵の移動・漏れ判定
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.slowTimer > 0) {
        e.slowTimer -= d;
        if (e.slowTimer <= 0) {
          e.slowTimer = 0; e.slowMult = 1;
          if (e.hasSprite) e.body.clearTint();
          else e.body.setFillStyle(e.def.color);
        }
      }
      e.dist += e.speed * (e.slowMult || 1) * dt;
      if (e.dist >= this.path.total) {
        // ゴール到達＝ライフ減・撃破報酬なし
        e.alive = false;
        this.lives -= e.def.leak;
        this.flashColor(this.livesText, COLORS.lives);
        this.destroyEnemyGfx(e);
        this.updateHud();
        Sfx.leak();
        if (this.lives <= 0) { this.lives = 0; this.updateHud(); this.showEnd(false); return; }
        continue;
      }
      const pos = posAt(this.path, e.dist);
      e.x = pos.x; e.y = pos.y;
      e.body.setPosition(pos.x, pos.y);
      if (e.hasSprite) {
        // 歩きアニメ（8fps）
        e.animTimer += dt * 1000;
        if (e.animTimer >= 125) {
          e.animTimer -= 125;
          e.animFrame = (e.animFrame + 1) % 4;
          e.body.setTexture(`${e.type}_walk_${e.animFrame + 1}`);
        }
        // 移動方向に応じて左右反転
        const posNext = posAt(this.path, Math.min(e.dist + 2, this.path.total));
        e.body.setFlipX(posNext.x < pos.x);
      } else {
        e.face.setPosition(pos.x, pos.y);
      }
      const by = pos.y - e.barYOff;
      e.hpBg.setPosition(pos.x - e.barW / 2, by);
      e.hpFill.setPosition(pos.x - e.barW / 2, by);
    }

    // 3) タワーの射撃
    const ATTACK_SEQ = ['attack_1', 'attack_2', 'attack_3', 'attack_4', 'return_1', 'return_2'];
    for (const t of this.towers) {
      // タワーアニメーション
      t.animTimer += d;
      if (t.animState === 'attack') {
        const fi = Math.floor(t.animTimer / 80);
        if (fi >= ATTACK_SEQ.length) {
          t.animState = 'idle';
          t.animTimer = 0;
          t.sprite.setTexture(`${t.key}_idle`);
        } else {
          t.sprite.setTexture(`${t.key}_${ATTACK_SEQ[fi]}`);
        }
      } else {
        t.sprite.setTexture(Math.floor(t.animTimer / 1500) % 2 === 0 ? `${t.key}_idle` : `${t.key}_idle_alt`);
      }

      t.cd -= d;
      if (t.cd <= 0) {
        if (t.shots > 1) {
          // 受付嬢など：同時に複数ターゲットへ発射
          const targets = this.findTargets(t, t.shots);
          if (targets.length > 0) {
            for (const tgt of targets) this.fireTower(t, tgt);
            t.cd = t.fireRate;
          } else t.cd = 0;
        } else {
          const target = this.findTarget(t);
          if (target) { this.fireTower(t, target); t.cd = t.fireRate; }
          else t.cd = 0;
        }
      }
    }

    // 4) 弾の更新
    for (const p of this.projectiles) this.updateProjectile(p, dt);

    // 5) 後始末（死んだ敵・弾を配列から除去）
    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // 6) ウェーブ完了判定
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.onWaveComplete();
    }

    // 7) パネルが開いている間にお金が変化したらボタン状態を再描画
    if (this.panelDirty && this.currentPanel) {
      this.panelDirty = false;
      this.refreshPanel();
    }
  }
}
