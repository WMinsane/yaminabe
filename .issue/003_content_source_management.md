# 003 コンテンツソース管理（ドメインポリシー）の導入

- Status: Closed
- 起票日: 2026-04-12
- 完了日: 2026-06-07

## 背景

はてなブックマークのhotentryから収集すると、Yaminabeのコンセプト（記事による視野拡大）と不一致なドメインが大量に混入する。

### 実態（2026-04-12時点・全1684件中）

| ドメイン | 件数 | 性質 |
|---|---|---|
| togetter.com | 83 | ツイートまとめ（記事ではない） |
| posfie.com | 12 | ツイートまとめ |
| anond.hatelabo.jp | 17 | 匿名ポエム・質ばらつき |
| nikkei.com | 16 | 有料・商用利用要許諾 |
| asahi.com | 12 | 有料・商用利用要許諾 |
| news.yahoo.co.jp | 12 | 配信ニュース・短期URL |

CLAUDE.mdで除外と明記しているITmedia等もはてブ経由で混入していた（※ITmediaはエンジニア向けで会員登録前提のため許容）。

## 要望

1. **ドメイン単位**でブロック/許可を管理できるDB構造
2. 収集時に自動フィルタ（ブロックドメインは登録しない）
3. 既存DBから該当レコードを論理削除
4. 初期ブロックリストをseedで投入
5. 将来的にCRUD UI化できる前提の設計

## 設計案

### 新規テーブル: `domain_policy`

```prisma
model DomainPolicy {
  id        Int      @id @default(autoincrement())
  domain    String   @unique @db.VarChar(255)  // 例: "togetter.com"
  policy    String   @db.VarChar(10)            // "block" | "allow"
  reason    String?  @db.VarChar(500)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy String?  @map("updated_by") @db.VarChar(25)
  deletedAt DateTime? @map("deleted_at")

  @@index([policy, deletedAt])
  @@map("domain_policy")
}
```

**設計判断**:
- `policy` をENUMでなく文字列にする理由: 将来 `review`（要審査）等の状態を追加しやすい
- `domain` はホスト名のみ（サブドメイン含む完全一致）。`www.` は正規化して保存
- ホワイトリスト方式ではなくブラックリスト方式（許可は明示登録不要）
- `allow` は将来「ブロックされた親ドメインの特定サブパスを許可」等の例外用

### 収集側の変更

`batch/register.py` (および将来の収集処理):
1. INSERT前にURLをパース→ホスト名抽出→`domain_policy` を参照
2. `policy='block'` に該当したらスキップ（INSERTしない）
3. ログに「blocked: {domain} (count: N)」を出力

### 既存データのクリーンアップ

```sql
UPDATE content
SET deleted_at = NOW(), updated_by = 'cleanup_001'
WHERE deleted_at IS NULL
  AND regexp_replace(url, '^https?://(www\.)?([^/]+).*', '\2')
      IN (SELECT domain FROM domain_policy WHERE policy='block' AND deleted_at IS NULL);
```

論理削除のみ（物理削除はしない）。`UserAction`への外部キーがあるため。

### 初期blocklist (seed)

| domain | reason |
|---|---|
| togetter.com | ツイートまとめサイト・記事ではない |
| posfie.com | ツイートまとめサイト・記事ではない |
| anond.hatelabo.jp | 匿名投稿・質ばらつき大 |
| nikkei.com | 有料記事・商用利用要許諾 |
| asahi.com | 有料記事・商用利用要許諾 |
| news.yahoo.co.jp | 配信ニュース・短期URL・権利複雑 |

### 実装手順

1. `schema.prisma` に `DomainPolicy` モデル追加
2. `prisma migrate dev --name add_domain_policy`
3. `db-schema.md` 更新（テーブル追加）
4. `prisma/seed.ts` に初期blocklist追加
5. `register.py` にフィルタロジック追加
6. クリーンアップSQL実行（既存レコード論理削除）
7. フィード/ライブラリ画面の取得クエリに `deletedAt: null` 確認（既存のはず）

## 影響範囲

- DB: 新規テーブル1
- バッチ: register.py
- ドキュメント: db-schema.md, er-diagram.md, CLAUDE.md（除外ドメイン記述更新）
- 既存データ: 約140件が論理削除対象（togetter+posfie+anond+nikkei+asahi+yahoo）
