// ゲーム全体の定数・チューニング・マップ形状の正本。
// 「データ（ここ・content.js）」と「エンジン（scenes）」を分離する設計（starter-kit RESKIN思想）。

export const GAME_W = 1280;
export const GAME_H = 720;

// 経済・ライフ（TUNING）
export const START_MONEY = 100; // 序盤は警備員2基ぶん。あとは撃破報酬で増やす
export const START_LIVES = 20;

// 色（プレースホルダー図形用。絵を入れる段で差し替え）
export const COLORS = {
  bg: 0x223043,
  road: 0x3c4a5e,
  roadEdge: 0x556579,
  slot: 0x2f3e52,
  slotHover: 0x4a6076,
  text: '#eef3f8',
  money: '#ffd866',
  lives: '#ff6b6b',
  rangePreview: 0x9ad0ff,
};

// 敵が進む経路（道）。1本道。画面外左から入り、画面外右へ抜ける。
// S字（3レーン）にして、レーン間にタワーを置く余地を作る。
export const PATH = [
  [-60, 120],
  [1080, 120],
  [1080, 300],
  [200, 300],
  [200, 480],
  [1340, 480],
];

export const ROAD_WIDTH = 56;

// タワー設置スロット（道の脇）。クリックで建設メニューが出る。
export const BUILD_SPOTS = [
  { x: 320, y: 210 },
  { x: 520, y: 210 },
  { x: 720, y: 210 },
  { x: 920, y: 210 },
  { x: 1170, y: 210 },
  { x: 120, y: 390 },
  { x: 360, y: 390 },
  { x: 560, y: 390 },
  { x: 760, y: 390 },
  { x: 960, y: 390 },
];
