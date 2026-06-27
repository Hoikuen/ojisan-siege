// 実機検証スクリプト（Playwright + システムChrome / ブラウザDL不要）。
// MISTAKESの教訓：①実際のcreate()起動パスを最後まで通す ②rAFループを実時間で回して
// 敵スポーン→移動→発射→被弾→撃破→報酬を観測 ③漏れ/敗北/クリアの各分岐も発火させる。
import { chromium } from 'playwright-core';

const URL = process.env.URL || 'http://localhost:5173/';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1320, height: 800 } });

const consoleErrors = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

try {
  await page.goto(URL, { waitUntil: 'load' });

  // create() が最後まで通ったか（HUD・スロットまで生成済み）を待つ
  await page.waitForFunction(() => {
    const g = window.__game; if (!g) return false;
    const s = g.scene.getScene('GameScene');
    return !!(s && s.hintText && s.spots && s.spots.length === 10);
  }, { timeout: 10000 });

  // ── T0: 起動・初期状態 ──
  const s0 = await page.evaluate(() => {
    const g = window.__game; const s = g.scene.getScene('GameScene');
    return {
      booted: g.isBooted, hasHud: !!(s.hintText && s.waveBtnText && s.moneyText),
      spots: s.spots.length, money: s.money, lives: s.lives,
      waveStarted: s.waveStartedCount, pathTotal: Math.round(s.path.total),
      canvas: !!g.canvas && g.canvas.width > 0,
    };
  });
  check('起動：create()完走（HUD/スロット生成）', s0.hasHud && s0.spots === 10, `spots=${s0.spots}`);
  check('起動：canvas生成', s0.canvas);
  check('初期：money=100 / lives=20 / wave=0', s0.money === 100 && s0.lives === 20 && s0.waveStarted === 0,
    `money=${s0.money} lives=${s0.lives} wave=${s0.waveStarted}`);
  check('経路：総距離>0', s0.pathTotal > 0, `total=${s0.pathTotal}px`);

  // ── ループが実時間で進行しているか（rAFが回っているか）──
  const f1 = await page.evaluate(() => window.__game.loop.frame);
  await sleep(400);
  const f2 = await page.evaluate(() => window.__game.loop.frame);
  check('ループ：rAFが進行している', f2 > f1, `frame ${f1}→${f2}`);

  // ── T1: 経済（建設コスト・所持金不足の拒否）──
  const econ = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    const start = s.money;                       // 100
    s.buildTower(s.spots[0], 'guard');           // -50 → 50
    const afterG1 = s.money;
    s.buildTower(s.spots[1], 'guard');           // -50 → 0
    const afterG2 = s.money;
    const towersAfter2 = s.towers.length;
    s.buildTower(s.spots[2], 'soba');            // cost75 > money0 → 拒否
    const afterReject = s.money;
    const towersAfterReject = s.towers.length;
    return { start, afterG1, afterG2, towersAfter2, afterReject, towersAfterReject };
  });
  check('経済：建設で正しく減算（100→50→0）', econ.afterG1 === 50 && econ.afterG2 === 0);
  check('経済：2基建設でtowers=2', econ.towersAfter2 === 2, `towers=${econ.towersAfter2}`);
  check('経済：所持金不足の建設は拒否（金もtowerも不変）',
    econ.afterReject === 0 && econ.towersAfterReject === 2,
    `money=${econ.afterReject} towers=${econ.towersAfterReject}`);

  // ── T2: 強化 ──
  const up = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.money = 999;
    const t = s.towers[0];
    const dmg0 = t.damage, rng0 = t.range, lv0 = t.level, m0 = s.money;
    s.upgradeTower(t);
    return { lv0, lv1: t.level, dmgUp: t.damage > dmg0, rngUp: t.range > rng0, spent: m0 - s.money };
  });
  check('強化：Lvが上がり威力/射程が増加・費用減算', up.lv1 === up.lv0 + 1 && up.dmgUp && up.rngUp && up.spent > 0,
    `Lv${up.lv0}→${up.lv1} spent=${up.spent}`);

  // 撃破観測用のフック（fireTower/ damageEnemy をラップしてカウント）＋火力増設
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.money = 999;
    s.buildTower(s.spots[2], 'guard'); // lane1をさらにカバー
    s.buildTower(s.spots[3], 'soba');
    window.__stats = { fired: 0, kills: 0, moneyAtWaveStart: 0, maxEnemies: 0 };
    const oFire = s.fireTower.bind(s);
    s.fireTower = (t, tg) => { window.__stats.fired++; return oFire(t, tg); };
    const oDmg = s.damageEnemy.bind(s);
    s.damageEnemy = (e, d) => { const was = e.alive; oDmg(e, d); if (was && !e.alive) window.__stats.kills++; };
    window.__stats.moneyAtWaveStart = s.money;
    s.startWave();
  });

  // ── T3: ウェーブ進行（実時間で回す）──spawn→移動を観測
  await sleep(1500);
  const mid = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    window.__stats.maxEnemies = Math.max(window.__stats.maxEnemies, s.enemies.length);
    const moving = s.enemies.some((e) => e.dist > 0);
    return { waveStarted: s.waveStartedCount, waveActive: s.waveActive, enemies: s.enemies.length, moving };
  });
  check('ウェーブ：開始でwave=1・敵がスポーン', mid.waveStarted === 1 && mid.enemies > 0,
    `enemies=${mid.enemies}`);
  check('敵：経路上を移動している（dist>0）', mid.moving);

  // 撃破証拠用スクショ（中盤）
  await page.screenshot({ path: '/tmp/ojisan-siege-mid.png' });

  // 残りを回しきる（最大25秒）。タワー発射・撃破・報酬を観測
  for (let i = 0; i < 25; i++) {
    const st = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      window.__stats.maxEnemies = Math.max(window.__stats.maxEnemies, s.enemies.length);
      return { active: s.waveActive, enemies: s.enemies.length, queue: s.spawnQueue.length };
    });
    if (!st.active && st.enemies === 0 && st.queue === 0) break;
    await sleep(1000);
  }
  const after = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    return { stats: window.__stats, money: s.money, lives: s.lives, waveStarted: s.waveStartedCount };
  });
  check('タワー：弾を発射した', after.stats.fired > 0, `fired=${after.stats.fired}`);
  check('戦闘：敵を撃破した', after.stats.kills > 0, `kills=${after.stats.kills}`);
  check('経済：撃破報酬で所持金が増えた',
    after.money > after.stats.moneyAtWaveStart, `${after.stats.moneyAtWaveStart}→${after.money}`);

  // ── T4: 漏れ→ライフ減少（決定的に発火）──
  const leak = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    const before = s.lives;
    s.spawnEnemy('grunt');
    s.enemies[s.enemies.length - 1].dist = s.path.total - 2; // 次フレームでゴール到達
    return { before };
  });
  await sleep(350);
  const leakAfter = await page.evaluate(() => window.__game.scene.getScene('GameScene').lives);
  check('漏れ：ゴール到達でライフ減少', leakAfter === leak.before - 1, `${leak.before}→${leakAfter}`);

  // ── T5: 敗北オーバーレイ（lives 0 で発火）──
  const lose = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.lives = 1;
    s.spawnEnemy('grunt');
    s.enemies[s.enemies.length - 1].dist = s.path.total - 2;
    return true;
  });
  await sleep(350);
  const loseState = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    const texts = s.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
    return { gameOver: s.gameOver, hasLose: texts.some((t) => t.includes('ゲームオーバー')) };
  });
  check('敗北：lives0でゲームオーバー表示＆停止', loseState.gameOver && loseState.hasLose,
    `gameOver=${loseState.gameOver} overlay=${loseState.hasLose}`);

  // ── T6: クリア（リロードして決定的に発火）──
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => {
    const g = window.__game; const s = g && g.scene.getScene('GameScene');
    return !!(s && s.spots && s.spots.length === 10);
  }, { timeout: 10000 });
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.waveActive = true;          // 最終ウェーブ進行中
    s.waveStartedCount = 99;      // >= WAVES.length
    s.spawnQueue = [];            // 湧き切った
    s.enemies = [];               // 全滅
  });
  await sleep(250);
  const win = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    const texts = s.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
    return { gameOver: s.gameOver, hasWin: texts.some((t) => t.includes('クリア')) };
  });
  check('クリア：全ウェーブ突破でクリア表示', win.gameOver && win.hasWin,
    `gameOver=${win.gameOver} overlay=${win.hasWin}`);
  await page.screenshot({ path: '/tmp/ojisan-siege-clear.png' });

  // ── T7: コントロール（速度・一時停止・売却・ミュート）──新規機能 ──
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => {
    const s = window.__game?.scene.getScene('GameScene'); return s?.spots?.length === 10;
  }, { timeout: 10000 });

  const spd = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    const a = s.gameSpeed; s.toggleSpeed(); const b = s.gameSpeed; s.toggleSpeed(); const c = s.gameSpeed;
    return { a, b, c };
  });
  check('速度：1x→2x→1x 切替', spd.a === 1 && spd.b === 2 && spd.c === 1, `${spd.a}/${spd.b}/${spd.c}`);

  const sell = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.money = 200;
    s.buildTower(s.spots[0], 'guard');
    const before = s.money; const tw = s.towers.length; const t = s.spots[0].tower;
    const refund = s.sellValueOf(t);
    s.sellTower(t);
    return { before, after: s.money, refund, twBefore: tw, twAfter: s.towers.length, freed: !s.spots[0].tower };
  });
  check('売却：払い戻し＋スロット解放＋tower数減',
    sell.after === sell.before + sell.refund && sell.twAfter === sell.twBefore - 1 && sell.freed,
    `+$${sell.refund}`);

  await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.spawnEnemy('grunt');
    s._te = s.enemies[s.enemies.length - 1];
    s.paused = true; s._d0 = s._te.dist;
  });
  await sleep(400);
  const pausedMove = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    const moved = s._te.dist - s._d0; s.paused = false; s._d1 = s._te.dist; return moved;
  });
  await sleep(400);
  const resumedMove = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene'); return s._te.dist - s._d1;
  });
  check('一時停止：停止中は敵が動かない', Math.abs(pausedMove) < 0.5, `Δ=${pausedMove.toFixed(2)}`);
  check('再開：解除で敵が動く', resumedMove > 0, `Δ=${resumedMove.toFixed(2)}`);

  const mute = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.toggleMute(); const a = s.muteBtn.text.text; s.toggleMute(); const b = s.muteBtn.text.text;
    return { a, b };
  });
  check('ミュート：ボタン表示が🔇⇄🔊で切替', mute.a === '🔇' && mute.b === '🔊', `${mute.a}/${mute.b}`);

  // ── コンソール/例外 ──
  check('コンソール：エラーなし', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('実行時：未捕捉例外なし', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (err) {
  check('スクリプト実行', false, String(err && err.message || err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
if (failed.length) { console.log('FAILED:', failed.map((f) => f.name).join(', ')); process.exit(1); }
