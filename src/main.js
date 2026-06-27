import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from './config.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: COLORS.bg,
  // 物理エンジンは使わない（TDは経路上の距離移動＋距離判定で十分・Phaser物理の落とし穴を回避）
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

// 検証/デバッグ用フック（本番でも無害）。Playwright等から起動パス・状態を観測する。
if (typeof window !== 'undefined') window.__game = game;
