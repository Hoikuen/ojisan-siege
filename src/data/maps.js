// マップ＝データ（多マップ対応の肝）。エンジンは MAPS[index] を読むだけ。
// マップを足す＝この配列に1要素足すだけ（経路・スロット・ウェーブ・初期値を持つ）。
// 敵/タワーの定義は content.js（全マップ共通）。

export const MAPS = [
  {
    name: '住宅街',
    bgKey: 'jyutakugai',
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
        { type: 'subashikko', count: 6, gap: 280 },
        { type: 'runner', count: 8, gap: 360 },
        { type: 'grunt', count: 6, gap: 520 },
      ],
      [
        { type: 'grunt', count: 14, gap: 430 },
        { type: 'zombie', count: 3, gap: 1200 },
        { type: 'brute', count: 4, gap: 1050 },
        { type: 'runner', count: 12, gap: 300 },
        { type: 'boss', count: 1, gap: 600 },
      ],
    ],
  },
  {
    name: '商店街',
    bgKey: 'shotengai',
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
        { type: 'subashikko', count: 8, gap: 240 },
        { type: 'runner', count: 10, gap: 320 },
        { type: 'brute', count: 3, gap: 1100 },
        { type: 'grunt', count: 8, gap: 460 },
      ],
      [
        { type: 'grunt', count: 16, gap: 380 },
        { type: 'zombie', count: 4, gap: 1000 },
        { type: 'brute', count: 5, gap: 900 },
        { type: 'subashikko', count: 8, gap: 220 },
        { type: 'runner', count: 14, gap: 260 },
        { type: 'boss', count: 2, gap: 1600 },
      ],
    ],
  },
  {
    name: 'オフィス街',
    roadWidth: 50,
    startMoney: 130,
    startLives: 20,
    // 5レーン蛇行（左上→右→左→右→左→右下へ抜ける）
    path: [
      [-60, 90], [1220, 90], [1220, 200], [100, 200],
      [100, 310], [1220, 310], [1220, 420], [100, 420],
      [100, 530], [1340, 530],
    ],
    spots: [
      { x: 300, y: 145 }, { x: 560, y: 145 }, { x: 820, y: 145 }, { x: 1060, y: 145 },
      { x: 300, y: 255 }, { x: 560, y: 255 }, { x: 820, y: 255 },
      { x: 300, y: 365 }, { x: 560, y: 365 }, { x: 820, y: 365 }, { x: 1060, y: 365 },
      { x: 300, y: 475 }, { x: 560, y: 475 }, { x: 820, y: 475 },
    ],
    waves: [
      [
        { type: 'grunt',      count: 20, gap: 480 },
        { type: 'runner',     count: 12, gap: 300 },
        { type: 'subashikko', count: 10, gap: 200 },
      ],
      [
        { type: 'grunt',      count: 16, gap: 400 },
        { type: 'brute',      count: 6,  gap: 800 },
        { type: 'zombie',     count: 5,  gap: 900 },
        { type: 'runner',     count: 16, gap: 260 },
        { type: 'subashikko', count: 12, gap: 180 },
      ],
      [
        { type: 'grunt',      count: 20, gap: 360 },
        { type: 'brute',      count: 8,  gap: 700 },
        { type: 'zombie',     count: 6,  gap: 800 },
        { type: 'runner',     count: 20, gap: 240 },
        { type: 'subashikko', count: 15, gap: 160 },
        { type: 'boss',       count: 3,  gap: 2000 },
      ],
    ],
  },
];
