// コンテンツ＝データ（リスキンの肝）。エンジンはこれを読むだけ。
// 敵・タワー・ウェーブを増やす＝ここを足す（scenesのコードは触らない）。

// ── 敵の種類 ───────────────────────────────────────────────
// hp:体力 / speed:px毎秒 / reward:撃破で得る金 / leak:漏れたら減るライフ
// size:見た目の一辺(px) / color:プレースホルダー色
export const ENEMIES = {
  grunt:      { name: 'チビおじ',       hp: 10,  speed: 88,  reward: 5,  leak: 1, size: 26, color: 0x5b8def },
  runner:     { name: 'いそぎおじ',     hp: 6,   speed: 185, reward: 4,  leak: 1, size: 20, color: 0x46c98b },
  brute:      { name: 'ごりおじ',       hp: 50,  speed: 54,  reward: 16, leak: 3, size: 28, color: 0xc56b3a },
  boss:       { name: 'ボスおじ',       hp: 400, speed: 40,  reward: 95, leak: 8, size: 32, color: 0xb05ad0 },
  subashikko: { name: 'すばしっこおじ', hp: 3,   speed: 270, reward: 3,  leak: 1, size: 18, color: 0x3de87a },
  zombie:     { name: 'ゾンビおじ',     hp: 30,  speed: 65,  reward: 10, leak: 2, size: 32, color: 0x7fbf4d, splits: true },
};

// ── タワーの種類 ───────────────────────────────────────────
// kind: 'single'（単体）/ 'splash'（着弾点の範囲）。エンジンは kind で分岐する。
// cost:建設費 / range:射程 / damage:1発 / fireRate:発射間隔ms / projSpeed:弾速px毎秒
// splash:範囲半径(splashのみ) / maxLevel:強化上限
// up:強化1段の上昇量（cost＝強化費） — レベルが上がるたび damage/range/splash が増える
export const TOWERS = {
  guard: {
    name: 'サラリーマン',
    kind: 'single', color: 0x2f6fb0,
    projColors: [0xf0e6d0, 0x8b6344, 0xb0b8c8],
    projSizes:  [5, 7, 10],
    cost: 50, range: 122, damage: 4, fireRate: 520, projSpeed: 640, splash: 0,
    maxLevel: 15, up: { cost: 18, damage: 2, range: 10, splash: 0 },
  },
  soba: {
    name: 'ゆとり社員', kind: 'splash', color: 0x6aaa5a,
    projColors: [0xf5f0e0, 0xe8e0c8, 0xddd0b0],
    projSizes:  [7, 9, 11],
    cost: 75, range: 100, damage: 3, fireRate: 950, projSpeed: 460, splash: 70,
    maxLevel: 15, up: { cost: 22, damage: 1, range: 8, splash: 6 },
  },
  sniper: {
    name: '警備員', kind: 'single', color: 0x4a5568,
    projColors: [0xffffff, 0xffd700, 0xff8c00],
    projSizes:  [4, 6, 9],
    cost: 90, range: 200, damage: 18, fireRate: 2000, projSpeed: 900, splash: 0,
    maxLevel: 15, up: { cost: 20, damage: 7, range: 12, splash: 0 },
  },
  receptionist: {
    name: '受付嬢', kind: 'charm', color: 0xe87ac1, projColor: 0xff69b4,
    cost: 80, range: 130, damage: 0, fireRate: 1400, projSpeed: 380, splash: 0,
    shots: 1,
    maxLevel: 15, up: { cost: 18, damage: 0, range: 10, splash: 0, shots: 1 },
    slowMult: 0.35, slowDuration: 2500,
  },
};

// ── ウェーブ構成は各マップが持つ（src/data/maps.js）──
// group: {type, count, gap(ms)} を順に湧かせる。撃破報酬＋突破ボーナスで増強する。

// ウェーブ突破ボーナス（index対応・全マップ共通）。最終ウェーブ突破はクリアなので不要。
export const WAVE_CLEAR_BONUS = [40, 65];
