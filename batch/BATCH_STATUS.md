# バッチ処理ステータス

## カテゴリ自動分類（autotag.py）

| 項目 | 値 |
|------|------|
| 最終実行日 | 2026-04-11 |
| モデル | gemini-2.5-flash-lite |
| DB総件数 | 977件 |
| 分類済み | 440件（228 + 212追加） |
| 分類不能 | 18件 |
| 未分類 | 537件 |
| 中断理由 | Gemini無料枠の日次レート制限(429) |

### 再開方法

```bash
cd /home/user/claude-test/yaminabe/batch
source .venv/bin/activate
python autotag.py
```

- 未分類(`category_id IS NULL`)のみ自動対象。重複分類はしない
- `--limit N` で件数制限可能
- `--dry-run` でDB更新せず結果確認のみ
- 無料枠リセット後（翌日）に再実行すれば残り749件を処理可能

### 補足

- `gemini-2.0-flash-lite` は無料枠廃止済み。`gemini-2.5-flash-lite` を使用
- architecture.md の記載は要更新（gemini-2.0-flash-lite → gemini-2.5-flash-lite）
