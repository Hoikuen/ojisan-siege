// マップ＝データ（多マップ対応の肝）。エンジンは MAPS[index] を読むだけ。
// マップを足す＝この配列に1要素足すだけ（経路・スロット・ウェーブ・初期値を持つ）。
// 敵/タワーの定義は content.js（全マップ共通）。

// 30波分のウェーブを自動生成。mapDiff=1/2/3 で難易度スケール。
function generateWaves(mapDiff, count = 30) {
  const waves = [];
  for (let w = 1; w <= count; w++) {
    const s = (1 + (w - 1) * 0.05) * (0.8 + mapDiff * 0.2); // 波数×難易度スケール
    const wave = [];

    // grunt（常時）
    wave.push({
      type: 'grunt',
      count: Math.min(40, Math.max(3, Math.round((5 + w * 0.7) * s * 0.55))),
      gap: Math.max(270, 560 - w * 9),
    });
    // subashikko（4波から）
    if (w >= 4) {
      wave.push({
        type: 'subashikko',
        count: Math.min(20, Math.max(2, Math.round((2 + w * 0.35) * s * 0.5))),
        gap: Math.max(150, 290 - w * 4),
      });
    }
    // runner（7波から）
    if (w >= 7) {
      wave.push({
        type: 'runner',
        count: Math.min(20, Math.max(3, Math.round((3 + w * 0.45) * s * 0.5))),
        gap: Math.max(200, 360 - w * 5),
      });
    }
    // brute（13波から）
    if (w >= 13) {
      wave.push({
        type: 'brute',
        count: Math.min(10, Math.max(1, Math.round((1 + (w - 13) * 0.22) * s * 0.45))),
        gap: Math.max(600, 1100 - w * 14),
      });
    }
    // zombie（17波から）
    if (w >= 17) {
      wave.push({
        type: 'zombie',
        count: Math.min(8, Math.max(1, Math.round((1 + (w - 17) * 0.18) * s * 0.4))),
        gap: Math.max(700, 1200 - w * 14),
      });
    }
    // boss（10波ごと）
    if (w % 10 === 0) {
      wave.push({
        type: 'boss',
        count: Math.min(5 * mapDiff, Math.max(1, Math.floor(w / 10) * mapDiff)),
        gap: Math.max(1400, 3500 - w * 40),
      });
    }

    waves.push(wave);
  }
  return waves;
}

export const MAPS = [
  {
    name: '住宅街',
    bgKey: 'jyutakugai',
    roadWidth: 56,
    startMoney: 100,
    startLives: 20,
    // S字（3レーン）— レーン中心 y=100/320/540 に合わせて背景を発注
    path: [
      [-60, 100], [1080, 100], [1080, 320], [200, 320], [200, 540], [1340, 540],
    ],
    spots: [
      { x: 320, y: 210 }, { x: 520, y: 210 }, { x: 720, y: 210 }, { x: 920, y: 210 }, { x: 1170, y: 210 },
      { x: 120, y: 430 }, { x: 360, y: 430 }, { x: 560, y: 430 }, { x: 760, y: 430 }, { x: 960, y: 430 },
    ],
    waves: generateWaves(1),
  },
  {
    name: '商店街',
    bgKey: 'shotengai',
    roadWidth: 56,
    startMoney: 115,
    startLives: 20,
    // 4レーン蛇行 — レーン中心 y=80/240/400/560 に合わせて背景を発注
    path: [
      [-60, 80], [1160, 80], [1160, 240], [140, 240],
      [140, 400], [1160, 400], [1160, 560], [-60, 560],
    ],
    spots: [
      { x: 340, y: 160 }, { x: 580, y: 160 }, { x: 820, y: 160 }, { x: 1040, y: 160 },
      { x: 340, y: 320 }, { x: 580, y: 320 }, { x: 820, y: 320 }, { x: 1040, y: 320 },
      { x: 340, y: 480 }, { x: 580, y: 480 }, { x: 820, y: 480 }, { x: 1040, y: 480 },
    ],
    waves: generateWaves(2),
  },
  {
    name: 'オフィス街',
    bgKey: 'officedistrict',
    roadWidth: 50,
    startMoney: 130,
    startLives: 20,
    // 5レーン蛇行 — レーン中心 y=70/195/320/445/570 に合わせて背景を発注
    path: [
      [-60, 70], [1220, 70], [1220, 195], [100, 195],
      [100, 320], [1220, 320], [1220, 445], [100, 445],
      [100, 570], [1340, 570],
    ],
    spots: [
      { x: 300, y: 132 }, { x: 560, y: 132 }, { x: 820, y: 132 }, { x: 1060, y: 132 },
      { x: 300, y: 257 }, { x: 560, y: 257 }, { x: 820, y: 257 },
      { x: 300, y: 382 }, { x: 560, y: 382 }, { x: 820, y: 382 }, { x: 1060, y: 382 },
      { x: 300, y: 507 }, { x: 560, y: 507 }, { x: 820, y: 507 },
    ],
    waves: generateWaves(3),
  },
];
