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
    // S字（3レーン） — レーン中心を背景画像の道路位置に合わせて調整
    path: [
      [-60, 100], [1080, 100], [1080, 310], [200, 310], [200, 555], [1340, 555],
    ],
    spots: [
      { x: 320, y: 205 }, { x: 520, y: 205 }, { x: 720, y: 205 }, { x: 920, y: 205 }, { x: 1170, y: 205 },
      { x: 120, y: 432 }, { x: 360, y: 432 }, { x: 560, y: 432 }, { x: 760, y: 432 }, { x: 960, y: 432 },
    ],
    waves: generateWaves(1),
  },
  {
    name: '商店街',
    bgKey: 'shotengai',
    roadWidth: 56,
    startMoney: 115,
    startLives: 20,
    // 4レーンの蛇行 — レーン中心を背景画像の道路位置に合わせて調整
    path: [
      [-60, 100], [1160, 100], [1160, 230], [140, 230],
      [140, 360], [1160, 360], [1160, 490], [-60, 490],
    ],
    spots: [
      { x: 340, y: 165 }, { x: 580, y: 165 }, { x: 820, y: 165 }, { x: 1040, y: 165 },
      { x: 340, y: 295 }, { x: 580, y: 295 }, { x: 820, y: 295 }, { x: 1040, y: 295 },
      { x: 340, y: 425 }, { x: 580, y: 425 }, { x: 820, y: 425 }, { x: 1040, y: 425 },
    ],
    waves: generateWaves(2),
  },
  {
    name: 'オフィス街',
    bgKey: 'officedistrict',
    roadWidth: 50,
    startMoney: 130,
    startLives: 20,
    // 5レーン蛇行 — レーン中心を背景画像の道路位置に合わせて調整
    path: [
      [-60, 90], [1220, 90], [1220, 215], [100, 215],
      [100, 325], [1220, 325], [1220, 430], [100, 430],
      [100, 530], [1340, 530],
    ],
    spots: [
      { x: 300, y: 152 }, { x: 560, y: 152 }, { x: 820, y: 152 }, { x: 1060, y: 152 },
      { x: 300, y: 270 }, { x: 560, y: 270 }, { x: 820, y: 270 },
      { x: 300, y: 377 }, { x: 560, y: 377 }, { x: 820, y: 377 }, { x: 1060, y: 377 },
      { x: 300, y: 480 }, { x: 560, y: 480 }, { x: 820, y: 480 },
    ],
    waves: generateWaves(3),
  },
];
