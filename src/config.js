// ゲーム全体の定数（画面サイズ・色）。
// マップ形状・経済・ウェーブは「データ」側（src/data/maps.js, content.js）に一本化している。

export const GAME_W = 1280;
export const GAME_H = 720;

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
