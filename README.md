# おじさん襲来 / OJISAN SIEGE (ojisan-siege)

チビおじさん軍団がわらわら襲来するタワーディフェンス（Kingdom Rush風）。可愛い大量×配置の戦略。

- ステータス：**最小ループ実装済み（図形プレースホルダー）**。2マップ・3ウェーブ・タワー2種を遊べる。絵は未実装
- 設計：docs/GAME_DESIGN.md
- 進捗・残課題：docs/PROJECT_LOG.md
- 制作の正本：~/Developer/games/GAME_CRAFT_GUIDE.md

## 開発

```bash
npm install
npm run dev        # 開発サーバ（ブラウザで開く）
npm run build      # 本番ビルド（import漏れ等の検出にも使う）
```

## 検証（Playwright + システムChrome / ブラウザDL不要）

```bash
npm run dev                         # 別ターミナルで起動（例：ポート5199）
URL=http://localhost:5199/ node test/verify.mjs   # 機能検証（26項目）
URL=http://localhost:5199/ node test/tune.mjs     # バランス通しプレイ実測
```

## 遊び方

- スロット（＋）をクリック → 警備員（単体）／そば屋台（範囲）を建設
- タワーをクリック → 強化・売却
- 「ウェーブ開始」で敵が進軍。撃破でお金 → 増設・強化
- 全ウェーブ耐えるとマップクリア → 次マップ。全マップ制覇でゲームクリア。ライフ0で敗北・リトライ
- 右上：ゲーム速度（1x/2x）・一時停止・ミュート

## 構成（データ駆動・リスキン前提）

```
src/
├── main.js              # Phaser起動
├── config.js            # 画面サイズ・色
├── path.js              # 経路ヘルパー（距離→座標）
├── audio.js             # 手続き的効果音（Web Audio・アセット不要）
├── data/
│   ├── content.js       # 敵・タワーの定義（全マップ共通）
│   └── maps.js          # マップ（経路・スロット・ウェーブ・初期値）＝マップを足すだけで増える
└── scenes/GameScene.js  # エンジン（データを読むだけ）
```

絵は「実装が固まってから差し替え」。`~/Developer/games/_starter-kit/pipeline` の発注→抽出フローで投入する。
