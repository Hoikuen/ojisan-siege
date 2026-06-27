import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForFunction(() => { const s = window.__game?.scene.getScene('GameScene'); return s?.spots?.length === 10; }, { timeout: 10000 });
// 防御は警備員1基だけ。全ウェーブ自動開始して耐えられるか
await p.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); s.buildTower(s.spots[0], 'guard'); });
const t0 = Date.now(); let res = null;
while (Date.now() - t0 < 120000) {
  res = await p.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene');
    if (!s.waveActive && !s.gameOver && s.waveStartedCount < 3) s.startWave();
    const texts = s.children.list.filter(o => o.type === 'Text').map(o => o.text);
    return { over: s.gameOver, lives: s.lives, wave: s.waveStartedCount, lose: texts.some(t=>t.includes('ゲームオーバー')), win: texts.some(t=>t.includes('クリア')) };
  });
  if (res.over) break;
  await sleep(1000);
}
console.log(`1基のみ → ${res.over ? (res.lose?'敗北💥':'クリア') : 'TIMEOUT'}  残ライフ=${res.lives}/20  wave=${res.wave}/3`);
await b.close();
