// マップ＝データ（多マップ対応の肝）。エンジンは MAPS[index] を読むだけ。
// マップを足す＝この配列に1要素足すだけ（経路・スロット・ウェーブ・初期値を持つ）。
// 敵/タワーの定義は content.js（全マップ共通）。

export const MAPS = [
  {
    name: '住宅街',
    roadWidth: 56,
    startMoney: 100,
    startLives: 20,
    // S字（3レーン）
    path: [
      [-60, 120], [1080, 120], [1080, 300], [200, 300], [200, 480], [1340, 480],
    ],
    spots: [
      { x: 320, y: 210 }, { x: 520, y: 210 }, { x: 720, y: 210 }, { x: 920, y: 210 }, { x: 1170, y: 210 },
      { x: 120, y: 390 }, { x: 360, y: 390 }, { x: 560, y: 390 }, { x: 760, y: 390 }, { x: 960, y: 390 },
    ],
    waves: [
      [{ type: 'grunt', count: 12, gap: 650 }],
      [
        { type: 'grunt', count: 10, gap: 520 },
        { type: 'runner', count: 10, gap: 360 },
        { type: 'grunt', count: 6, gap: 520 },
      ],
      [
        { type: 'grunt', count: 14, gap: 430 },
        { type: 'brute', count: 4, gap: 1050 },
        { type: 'runner', count: 12, gap: 300 },
        { type: 'boss', count: 1, gap: 600 },
      ],
    ],
  },
  {
    name: '商店街',
    roadWidth: 56,
    startMoney: 115,
    startLives: 20,
    // 4レーンの蛇行（左上から入り、左下へ抜ける）。より長く曲がりが多い
    path: [
      [-60, 100], [1160, 100], [1160, 260], [140, 260],
      [140, 420], [1160, 420], [1160, 580], [-60, 580],
    ],
    spots: [
      { x: 340, y: 180 }, { x: 580, y: 180 }, { x: 820, y: 180 }, { x: 1040, y: 180 },
      { x: 340, y: 340 }, { x: 580, y: 340 }, { x: 820, y: 340 }, { x: 1040, y: 340 },
      { x: 340, y: 500 }, { x: 580, y: 500 }, { x: 820, y: 500 }, { x: 1040, y: 500 },
    ],
    waves: [
      [{ type: 'grunt', count: 16, gap: 560 }],
      [
        { type: 'grunt', count: 12, gap: 460 },
        { type: 'runner', count: 12, gap: 320 },
        { type: 'brute', count: 3, gap: 1100 },
        { type: 'grunt', count: 8, gap: 460 },
      ],
      [
        { type: 'grunt', count: 16, gap: 380 },
        { type: 'brute', count: 5, gap: 900 },
        { type: 'runner', count: 14, gap: 260 },
        { type: 'boss', count: 2, gap: 1600 },
      ],
    ],
  },
];
