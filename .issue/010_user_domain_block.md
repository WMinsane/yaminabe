# ユーザー単位ドメインブロック機能

- **Status**: Open
- **Priority**: High
- **起票日**: 2026-05-25
- **種別**: 仕様検討

## 課題

はてブ経由で拾われるnote記事等、いいね/ブクマ数はあるが内容が低品質なコンテンツがフィードに混入する。現状の`domain_banlist`はグローバル（管理者判断）のため、個人の好みに基づくフィルタリングができない。

## 方針

グローバル除外（`domain_banlist`）とユーザー個別除外（`user_domain_block`）の2層構造で運用。

### DBテーブル

`user_domain_block` テーブル新設:

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| user_id | VARCHAR(25) | FK → user, NOT NULL | |
| domain | VARCHAR(255) | NOT NULL | ブロック対象ドメイン |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (user_id, domain)

### フィルタリング

- フィード表示時のスコアリング（scoring.ts）でユーザーのブロックドメイン一覧を取得し、該当記事を除外
- `domain_banlist`（グローバル）→ 収集時に除外（既存）
- `user_domain_block`（個人）→ 表示時に除外（新規）

### UI

- ArticlePreviewモーダル内に「このサイトを非表示」ボタン追加
- 設定画面にブロック済みドメイン一覧・解除機能

## 背景

- 「予備校」系サイト等、はてブ経由で教養・ライフカテゴリに低品質コンテンツが混入
- note.comは玉石混交だがドメイン丸ごとブロックは過剰 → ユーザー判断に委ねる
- YouTube「興味なし」、X「興味がない」等、主要サービスでは標準的なUXパターン

## 関連

- `domain_banlist`: グローバル除外（管理者用）
- issue 009: ドメイン選定・コンテンツ品質管理
- issue 005: タグ管理UI（is_excluded）— タグ単位の除外は別レイヤー
