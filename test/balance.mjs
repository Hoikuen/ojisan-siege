// バランス通しプレイ：常識的な配置・強化で3ウェーブを実時間プレイし、勝てるか確認する。
// （win/loseの分岐発火はverify.mjsで確認済み。こちらは実際の難易度が成立するかの実測）
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1320, height: 800 } });
let consoleErrors = 0;
p.on('console', (m) => { if (m.type() === 'error') consoleErrors++; });
p.on('pageerror', () => { consoleErrors++; });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForFunction(() => {
  const g = window.__game; const s = g && g.scene.getScene('GameScene');
  return !!(s && s.spots && s.spots.length === 10);
}, { timeout: 10000 });

// 全3レーンをカバーする配置プラン（上帯spot=lane1/2、下帯spot=lane2/3）
await p.evaluate(() => {
  const s = window.__game.scene.getScene('GameScene');
  window.__plan = [
    { act: 'build', spot: 0, type: 'guard' },
    { act: 'build', spot: 6, type: 'guard' },
    { act: 'build', spot: 1, type: 'guard' },
    { act: 'build', spot: 8, type: 'soba' },
    { act: 'build', spot: 2, type: 'guard' },
    { act: 'upgrade', spot: 0 },
    { act: 'build', spot: 7, type: 'soba' },
    { act: 'build', spot: 3, type: 'guard' },
    { act: 'upgrade', spot: 6 },
    { act: 'upgrade', spot: 1 },
    { act: 'build', spot: 9, type: 'soba' },
    { act: 'upgrade', spot: 2 },
    { act: 'upgrade', spot: 8 },
  ];
  window.__doTurn = () => {
    const sc = window.__game.scene.getScene('GameScene');
    // 出来るだけ順番にプラン消化（手前が買えなければ後ろは待つ＝人間っぽい優先順）
    while (window.__plan.length) {
      const step = window.__plan[0];
      const spot = sc.spots[step.spot];
      if (step.act === 'build') {
        if (spot.tower) { window.__plan.shift(); continue; }
        if (sc.money < sc.constructor) {} // noop
        const cost = sc.towers && step.type === 'guard' ? 50 : 70;
        if (sc.money >= cost) { sc.buildTower(spot, step.type); window.__plan.shift(); }
        else break;
      } else {
        if (!spot.tower || spot.tower.level >= spot.tower.def.maxLevel) { window.__plan.shift(); continue; }
        const cost = Math.round(spot.tower.def.up.cost * spot.tower.level);
        if (sc.money >= cost) { sc.upgradeTower(spot.tower); window.__plan.shift(); }
        else break;
      }
    }
    // ウェーブが空いていれば次を開始
    if (!sc.waveActive && !sc.gameOver && sc.waveStartedCount < 3) sc.startWave();
  };
});

const t0 = Date.now();
let outcome = null;
while (Date.now() - t0 < 180000) {
  const st = await p.evaluate(() => {
    window.__doTurn();
    const s = window.__game.scene.getScene('GameScene');
    const texts = s.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
    return {
      gameOver: s.gameOver, lives: s.lives, money: s.money,
      wave: s.waveStartedCount, active: s.waveActive,
      enemies: s.enemies.length, towers: s.towers.length,
      win: texts.some((t) => t.includes('クリア')),
      lose: texts.some((t) => t.includes('ゲームオーバー')),
    };
  });
  if (st.gameOver) { outcome = st; break; }
  await sleep(1000);
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
if (!outcome) {
  console.log(`TIMEOUT after ${elapsed}s — 決着つかず`);
  const st = await p.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    return { lives: s.lives, wave: s.waveStartedCount, enemies: s.enemies.length, towers: s.towers.length };
  });
  console.log(JSON.stringify(st));
} else {
  console.log(`結果: ${outcome.win ? 'クリア🎉' : outcome.lose ? '敗北💥' : '不明'} （${elapsed}s）`);
  console.log(`  残ライフ=${outcome.lives}/20  最終wave=${outcome.wave}/3  タワー数=${outcome.towers}  所持金=${outcome.money}`);
}
console.log(`  コンソールエラー数=${consoleErrors}`);
await b.close();
