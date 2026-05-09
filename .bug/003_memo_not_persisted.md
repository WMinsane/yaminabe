# 003 メモがDB永続化されない

- Status: Fixed
- 報告日: 2026-04-12
- 確認日: 2026-04-12
- 影響範囲: ライブラリ画面（LibraryView, MemoModal）

## 現象

ライブラリ画面でメモを入力・保存しても、画面遷移すると消える。`useState`のクライアント状態のみで管理されており、DB(`UserAction.memo`)に書き込まれていない。

## 期待動作

メモ保存ボタンクリックでDBに書き込まれ、リロード・他画面遷移後も保持される。

## 修正方針

1. `apps/web/src/app/actions.ts` に `saveMemo(contentId, memo)` Server Actionを追加
   - `UserAction.memo`をUPSERT
   - 空文字なら`null`にクリア
2. `LibraryView.tsx` の`handleSaveMemo`からServer Action呼び出し
3. 保存後にrouter.refresh()でサーバー側データを再取得
