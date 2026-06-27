import { chromium } from 'playwright-core';
const URL = 'http://localhost:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1320,800'] });
const p = await b.newPage({ viewport: { width: 1320, height: 800 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForFunction(() => window.__game?.scene.getScene('GameScene')?.spots?.length === 10, { timeout: 10000 });
// ウェーブ開始前（タワー配置中）のスクショ
await p.screenshot({ path: '/tmp/siege-01-start.png' });
// タワー2基建てて起動
await p.evaluate(() => {
  const s = window.__game.scene.getScene('GameScene');
  s.buildTower(s.spots[0], 'guard');
  s.buildTower(s.spots[6], 'soba');
  s.buildTower(s.spots[1], 'guard');
  s.buildTower(s.spots[8], 'guard');
  s.buildTower(s.spots[2], 'soba');
});
await p.screenshot({ path: '/tmp/siege-02-towers.png' });
// ウェーブ1開始 → 1.5秒後（戦闘中）
await p.evaluate(() => window.__game.scene.getScene('GameScene').startWave());
await sleep(1500);
await p.screenshot({ path: '/tmp/siege-03-battle.png' });
// クリア（7秒でwave3完了させる）
await p.evaluate(() => {
  const s = window.__game.scene.getScene('GameScene');
  s.waveActive = true; s.waveStartedCount = 99; s.spawnQueue = []; s.enemies = [];
});
await sleep(400);
await p.screenshot({ path: '/tmp/siege-04-clear.png' });
await b.close();
console.log('screenshots saved: /tmp/siege-0{1..4}.png');
