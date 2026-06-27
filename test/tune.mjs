// バランス一括検証：3シナリオを実時間プレイして難易度の成立を測る。
// 目標 → 無防備:敗北 / 1基のみ:敗北 / 良配置:クリア（数値を詰めるための実測ハーネス）
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 良配置プラン（全経路をカバー＋強化）。コストは実際のdefから読む。
const GOOD_PLAN = [
  { act: 'build', spot: 0, type: 'guard' }, { act: 'build', spot: 6, type: 'guard' },
  { act: 'build', spot: 1, type: 'guard' }, { act: 'build', spot: 8, type: 'soba' },
  { act: 'build', spot: 2, type: 'guard' }, { act: 'upgrade', spot: 0 },
  { act: 'build', spot: 7, type: 'soba' }, { act: 'build', spot: 3, type: 'guard' },
  { act: 'build', spot: 9, type: 'soba' }, { act: 'upgrade', spot: 6 },
  { act: 'upgrade', spot: 1 }, { act: 'upgrade', spot: 2 }, { act: 'upgrade', spot: 8 },
  { act: 'build', spot: 4, type: 'guard' }, { act: 'build', spot: 5, type: 'guard' },
];

async function play(label, plan) {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1320, height: 800 } });
  let errs = 0;
  p.on('console', (m) => { if (m.type() === 'error') errs++; });
  p.on('pageerror', () => { errs++; });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => {
    const s = window.__game?.scene.getScene('GameScene'); return s?.spots?.length === 10;
  }, { timeout: 10000 });
  await p.evaluate((plan) => { window.__plan = plan; }, plan);

  const t0 = Date.now(); let res = null;
  while (Date.now() - t0 < 160000) {
    res = await p.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      // プラン消化（手前から、買えるものを順に）
      while (window.__plan.length) {
        const step = window.__plan[0];
        const spot = s.spots[step.spot];
        if (step.act === 'build') {
          if (spot.tower) { window.__plan.shift(); continue; }
          const cost = (step.type === 'guard') ? 50 : 75;
          if (s.money >= cost) { s.buildTower(spot, step.type); window.__plan.shift(); } else break;
        } else {
          if (!spot.tower || spot.tower.level >= spot.tower.def.maxLevel) { window.__plan.shift(); continue; }
          const cost = Math.round(spot.tower.def.up.cost * spot.tower.level);
          if (s.money >= cost) { s.upgradeTower(spot.tower); window.__plan.shift(); } else break;
        }
      }
      if (!s.waveActive && !s.gameOver && s.waveStartedCount < 3) s.startWave();
      const texts = s.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
      return {
        over: s.gameOver, lives: s.lives, wave: s.waveStartedCount, towers: s.towers.length,
        win: texts.some((t) => t.includes('クリア')), lose: texts.some((t) => t.includes('ゲームオーバー')),
      };
    });
    if (res.over) break;
    await sleep(800);
  }
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  const out = res.over ? (res.win ? 'クリア' : res.lose ? '敗北' : '?') : 'TIMEOUT';
  console.log(`[${label}] ${out}  残ライフ=${res.lives}/20  wave=${res.wave}/3  タワー=${res.towers}  (${sec}s, err=${errs})`);
  await b.close();
  return { out, lives: res.lives, wave: res.wave };
}

await play('無防備', []);
await play('1基のみ', [{ act: 'build', spot: 0, type: 'guard' }]);
await play('良配置', GOOD_PLAN);
