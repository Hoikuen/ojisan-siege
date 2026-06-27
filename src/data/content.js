// コンテンツ＝データ（リスキンの肝）。エンジンはこれを読むだけ。
// 敵・タワー・ウェーブを増やす＝ここを足す（scenesのコードは触らない）。

// ── 敵の種類 ───────────────────────────────────────────────
// hp:体力 / speed:px毎秒 / reward:撃破で得る金 / leak:漏れたら減るライフ
// size:見た目の一辺(px) / color:プレースホルダー色
export const ENEMIES = {
  grunt:  { name: 'チビおじ',   hp: 9,   speed: 85,  reward: 5,  leak: 1, size: 26, color: 0x5b8def },
  runner: { name: 'いそぎおじ', hp: 6,   speed: 165, reward: 4,  leak: 1, size: 20, color: 0x46c98b },
  brute:  { name: 'ごりおじ',   hp: 46,  speed: 52,  reward: 16, leak: 3, size: 36, color: 0xc56b3a },
  boss:   { name: 'ボスおじ',   hp: 360, speed: 38,  reward: 95, leak: 8, size: 52, color: 0xb05ad0 },
};

// ── タワーの種類 ───────────────────────────────────────────
// kind: 'single'（単体）/ 'splash'（着弾点の範囲）。エンジンは kind で分岐する。
// cost:建設費 / range:射程 / damage:1発 / fireRate:発射間隔ms / projSpeed:弾速px毎秒
// splash:範囲半径(splashのみ) / maxLevel:強化上限
// up:強化1段の上昇量（cost＝強化費） — レベルが上がるたび damage/range/splash が増える
export const TOWERS = {
  guard: {
    name: '警備員', kind: 'single', color: 0x2f6fb0, projColor: 0xcfe6ff,
    cost: 50, range: 135, damage: 4, fireRate: 520, projSpeed: 640, splash: 0,
    maxLevel: 3, up: { cost: 45, damage: 3, range: 16, splash: 0 },
  },
  soba: {
    name: '立ち食いそば屋台', kind: 'splash', color: 0xd98a2b, projColor: 0xffd98a,
    cost: 75, range: 108, damage: 3, fireRate: 950, projSpeed: 460, splash: 70,
    maxLevel: 3, up: { cost: 60, damage: 2, range: 10, splash: 12 },
  },
};

// ── ウェーブ（3つ耐えるとクリア）─────────────────────────────
// 各ウェーブ＝グループの配列。group: {type, count, gap(ms)} を順に湧かせる。
// 撃破報酬＋ウェーブ突破ボーナスで増設・強化していく。
export const WAVES = [
  // Wave 1：チビおじの群れ。1〜2基では取りこぼす量。
  [
    { type: 'grunt', count: 12, gap: 650 },
  ],
  // Wave 2：いそぎおじの突撃を挟む混成。速い敵は範囲（屋台）か数で止める。
  [
    { type: 'grunt',  count: 10, gap: 520 },
    { type: 'runner', count: 10, gap: 360 },
    { type: 'grunt',  count: 6,  gap: 520 },
  ],
  // Wave 3：ごりおじの壁＋いそぎおじ波状＋最後にボスおじ。
  [
    { type: 'grunt',  count: 14, gap: 430 },
    { type: 'brute',  count: 4,  gap: 1050 },
    { type: 'runner', count: 12, gap: 300 },
    { type: 'boss',   count: 1,  gap: 600 },
  ],
];

// ウェーブ突破ボーナス（index対応）。最終ウェーブ突破はクリアなので不要。
export const WAVE_CLEAR_BONUS = [40, 65];
