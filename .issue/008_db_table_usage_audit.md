# 008: DBテーブル利用状況監査

- **Status**: Open
- **Created**: 2026-05-24
- **Priority**: Medium

## 概要

全テーブルのレコード件数を確認し、未使用テーブルや不要データがないか監査する。

## タスク

- [ ] 全テーブルのレコード件数を取得
- [ ] レコード0件のテーブルを特定し、意図的な空（未使用機能）か不具合かを判別
- [ ] 不要テーブルがあれば削除検討
- [ ] deleted_atが設定済みの論理削除レコードの割合確認

## 確認用SQL

```sql
SELECT schemaname, relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

## 備考

- MVP開発中のため、将来機能用に空テーブルが存在する可能性あり
- NextAuth管理テーブル（user, account, session, verification_token）は認証基盤のため削除対象外
