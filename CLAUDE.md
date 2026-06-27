# おじさん襲来（OJISAN SIEGE）— Claude Code 用（このrepo専用）

チビおじさん軍団がわらわら襲来するタワーディフェンス（Kingdom Rush風）。各ゲームは自repoで自己完結。

## 着手前に読む（~/Developer/games/ 配下＝サンドボックスでも読める）
1. ~/Developer/games/GAME_CRAFT_GUIDE.md（制作フローの正本）
2. ~/Developer/games/PHASER3_CONSTRAINTS.md（技術の落とし穴）
3. ~/Developer/games/MISTAKES.md（既知のミス）
4. ~/Developer/games/_starter-kit/README.md（進め方）
5. このrepoの docs/GAME_DESIGN.md（このゲームの設計）

## ルール
- git identity は匿名（hoikuen / 295981446+Hoikuen@users.noreply.github.com）。コミット前に確認。
- まず図形プレースホルダーで最小ループを完成 → 面白いか確認 → 絵を作り込んで差し替え。先に全部の絵を作らない。
- このフォルダで起動すればサンドボックス＋フックで保護される（Vault・他データに触れない）。
- ローカルgit（init/add/commit）は壁の中でもOK。GitHubのrepo作成（gh）は非サンドボックスのセッションで行う。
- localhost / 127.0.0.1 は共有用URLとして案内しない。
