# ナンプレ GitHub版 v1.02
## v1.02 修正

- 「候補入力」ボタンの処理を再確認。
- GitHub Pages / ブラウザキャッシュで古い `app.js` が残り、ボタンだけ新しく表示される問題を防ぐため、CSS/JSにバージョンクエリを付与。
- 候補入力は現在盤面から全空マスの基本候補を再計算し、一括上書き。Undo/Redo対象。


GitHub Pages でそのまま動作する、9×9ナンプレです。ビルドツール・サーバーは不要です。

## レベル

- Lv1〜8: ブラウザ内で毎回新規生成。生成後に唯一解を検証します。
- Lv9: 難易度100。AI Escargot / Platinum Blonde / Golden Nugget の固定超難問群からランダム出題。
- Lv10: Arto Inkala が2012年に発表し「World's Hardest Sudoku」と広く紹介された固定問題。

### 難易度表示について

Lv1〜8の0〜99は、このアプリ独自の相対難易度です。初期ヒント数、基本・中級手筋での進み方、停滞量、探索複雑度を使って分類します。Sudoku Explainer (SE) の公式値ではありません。

Lv9は仕様上 `100` 固定、Lv10は別枠 `WORLD` 表示です。

## 実装済み

- 9×9
- 唯一解保証
- Lv1〜10
- 数字入力 / メモ入力
- 候補入力（全空マスへ基本候補を一括入力・Undo/Redo対応）
- Undo / Redo
- 重複表示 ON/OFF
- 同じ数字ハイライト ON/OFF
- 入力時の同数字メモ自動削除 ON/OFF
- 回答チェック / 誤答表示
- タイマー / 一時停止
- 自動保存 / 続きから
- キーボード操作（1〜9、矢印、N/Spaceでメモ、Aで候補入力、Delete/Backspaceで削除）
- スマホ縦画面 / PC対応

## GitHub Pagesへの配置

リポジトリ直下へこの一式を置き、GitHub Pages の公開元を main ブランチの `/ (root)` に設定してください。

## ファイル

- `index.html` UI
- `style.css` レスポンシブUI
- `js/sudoku.js` ソルバー・唯一解判定・問題生成・難易度評価
- `js/hard-puzzles.js` Lv9 / Lv10固定問題
- `js/app.js` ゲーム状態・操作・保存

## 固定問題の出典メモ

- AI Escargot — Arto Inkala (2006)
- Platinum Blonde — gsf / coloin 系の著名超難問
- Golden Nugget — tarek (2007)
- Inkala's World's Hardest — Arto Inkala (2012)

「世界一難しい」は評価尺度に依存するため数学的に一意な称号ではありません。本アプリでは、以前の仕様に合わせて著名なInkala 2012をLv10固定問題として扱います。
