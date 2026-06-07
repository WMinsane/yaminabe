# DB定義書

## 前提

- Supabase PostgreSQL
- ORM: Prisma（`@map` / `@@map` でsnake_case ↔ camelCase変換）
- 認証: カスタムセッション認証（NextAuth互換スキーマを維持し、将来のOAuth対応に備える）
- 認証関連テーブル（user, account, session, verification_token）のidはVARCHAR(25)/cuid
- アプリ独自テーブルのidはSERIAL（自動採番）。ただし中間テーブルは複合主キー
- 認証関連テーブルを参照するFKはVARCHAR(25)
- テーブル名はsnake_case（Prismaモデル名はPascalCase、`@@map`で変換）
- アプリ独自テーブルには共通カラム（created_at, updated_at, updated_by, deleted_at）を付与
  - created_at: Prisma `@default(now())`
  - updated_at: Prisma `@updatedAt` で自動管理
  - updated_by: Prisma Middlewareで認証ユーザーIDを自動セット（システム処理時はNULL）
  - deleted_at: ソフトデリート用。Prisma Middlewareで`delete`→`update(deleted_at)`に自動変換

---

## テーブル定義

### user（認証関連）

ユーザーアカウント。カスタム認証で管理。NextAuth互換スキーマを維持。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | VARCHAR(25) | PK, cuid | ユーザーID |
| name | VARCHAR(100) | NULL | 表示名 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| email_verified | TIMESTAMPTZ | NULL | メール認証日時 |
| image | VARCHAR(500) | NULL | アバターURL |
| password_hash | VARCHAR(255) | NOT NULL | パスワードハッシュ（bcrypt等） |
| plan | VARCHAR(10) | NOT NULL, DEFAULT 'free' | プラン（free / premium） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |

### account（認証関連）

外部認証プロバイダとの紐付け。OAuth対応時に使用予定（MVP段階では未使用）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | VARCHAR(25) | PK, cuid | |
| user_id | VARCHAR(25) | FK → user, NOT NULL | |
| type | VARCHAR(20) | NOT NULL | oauth / credentials |
| provider | VARCHAR(50) | NOT NULL | プロバイダ名 |
| provider_account_id | VARCHAR(255) | NOT NULL | プロバイダ側ID |
| refresh_token | TEXT | NULL | リフレッシュトークン |
| access_token | TEXT | NULL | アクセストークン |
| expires_at | INTEGER | NULL | トークン有効期限 |
| token_type | VARCHAR(50) | NULL | トークン種別 |
| scope | VARCHAR(255) | NULL | スコープ |
| id_token | TEXT | NULL | IDトークン |

**UNIQUE**: (provider, provider_account_id)

### session（認証関連）

ログインセッション。Cookie（yaminabe_session）のトークンと照合してログイン状態を判定。session.tsで管理。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | VARCHAR(25) | PK, cuid | |
| user_id | VARCHAR(25) | FK → user, NOT NULL | |
| session_token | VARCHAR(255) | UNIQUE, NOT NULL | セッショントークン |
| expires | TIMESTAMPTZ | NOT NULL | 有効期限 |

### verification_token（認証関連）

パスワードリセット用の一時トークン。有効期限10分。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| identifier | VARCHAR(255) | NOT NULL | メールアドレス等 |
| token | VARCHAR(255) | UNIQUE, NOT NULL | 認証トークン |
| expires | TIMESTAMPTZ | NOT NULL | 有効期限 |

**UNIQUE**: (identifier, token)

---

### code_master

汎用コードマスタ。温度ラベル等のコード値・表示ラベルを管理。有効期間で履歴管理。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| category | VARCHAR(30) | NOT NULL | コード分類（temperature等） |
| code_value | VARCHAR(20) | NOT NULL | コード値（1, 2, 3, 4, 5等） |
| code_label | VARCHAR(50) | NOT NULL | 表示ラベル |
| sort_order | SMALLINT | NOT NULL | 表示順 |
| valid_from | DATE | NOT NULL | 有効開始日 |
| valid_to | DATE | NULL | 有効終了日（NULL=無期限） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**UNIQUE**: (category, code_value, valid_from)

### category

記事の分類カテゴリ。親子関係による階層構造を持つ。parent_id NULLが大分類、値ありが子カテゴリ。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| parent_id | INTEGER | FK → category, NULL | 親カテゴリ（NULLならルート＝大分類） |
| name | VARCHAR(50) | UNIQUE, NOT NULL | カテゴリ名（テクノロジー, ビジネス・経済等） |
| slug | VARCHAR(30) | UNIQUE, NOT NULL | URL用識別子（technology, business等） |
| description | VARCHAR(200) | NULL | 説明 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

### tag

細粒度の分類タグ。カテゴリより詳細なクラスタリングに使用。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | タグ名（TypeScript, AWS, サーバレス等） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

### feed_source

コンテンツの取得元。はてブRSS、個人ブログ等のソースURLを管理。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| name | VARCHAR(100) | NOT NULL | ソース名（はてブ/テクノロジー等） |
| url | VARCHAR(500) | UNIQUE, NOT NULL | RSS/APIのURL |
| type | VARCHAR(20) | NOT NULL | hatena / rss / api |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 有効/無効 |
| last_fetched_at | TIMESTAMPTZ | NULL | 最終取得日時 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

### domain_banlist

コンテンツ収集時にブロックするドメインの一覧（グローバル）。register.pyで収集時にURLのhost部と完全一致でフィルタする。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| domain | VARCHAR(255) | UNIQUE, NOT NULL | ブロック対象ドメイン（完全一致） |
| reason | VARCHAR(500) | NULL | ブロック理由 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

### user_domain_block

ユーザー単位のドメインブロック。フィード表示時にそのユーザーだけ該当ドメインの記事を除外する。domain_banlist（グローバル）との2層構造。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| user_id | VARCHAR(25) | PK（複合）, FK → user, NOT NULL | |
| domain | VARCHAR(255) | PK（複合）, NOT NULL | ブロック対象ドメイン |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |

### content

収集した個別記事。feed_sourceから定時バッチで取得し蓄積。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| url | VARCHAR(2000) | UNIQUE, NOT NULL | 記事URL（重複排除キー） |
| title | VARCHAR(500) | NOT NULL | 記事タイトル |
| source | VARCHAR(100) | NOT NULL | 配信元識別子 |
| category_id | INTEGER | FK → category, NULL | カテゴリ（ルールベース/LLMで分類。未分類時はNULL） |
| feed_source_id | INTEGER | FK → feed_source, NULL | 取得元 |
| author | VARCHAR(200) | NULL | 記事の著者名 |
| summary | TEXT | NULL | 記事の要約 |
| bookmark_count | INTEGER | NOT NULL, DEFAULT 0 | はてブ数 |
| meta | JSONB | NULL | RSSメタデータ（keywords, og:image, description等。カテゴリ判定の根拠） |
| published_at | TIMESTAMPTZ | NULL | 記事の公開日時 |
| collected_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 収集日時 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

### content_tag

記事とタグの多対多中間テーブル。1記事に複数タグを付与。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| content_id | INTEGER | FK → content, NOT NULL | |
| tag_id | INTEGER | FK → tag, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (content_id, tag_id)

---

### user_setting

ユーザーごとの設定。配信モード・表示モード・抜粋方式等を保持。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| user_id | VARCHAR(25) | FK → user, UNIQUE, NOT NULL | |
| delivery_mode | VARCHAR(20) | NOT NULL, DEFAULT 'omakase' | 配信モード（trend / deep / casual / discovery / omakase） |
| omakase_level | SMALLINT | NOT NULL, DEFAULT 3 | おまかせレベル（1〜5） |
| display_mode | VARCHAR(10) | NOT NULL, DEFAULT 'dark' | 表示モード（light / dark） |
| excerpt_style | VARCHAR(20) | NOT NULL, DEFAULT 'title_only' | 抜粋方式（title_only / with_heading） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

### user_category

ユーザーが選択した興味カテゴリ。行動記録により重みが変動。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| user_id | VARCHAR(25) | FK → user, NOT NULL | |
| category_id | INTEGER | FK → category, NOT NULL | |
| weight | NUMERIC(5,2) | NOT NULL, DEFAULT 1.00 | パーソナライズ重み |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (user_id, category_id)

### user_tag

ユーザーの興味タグ。行動記録によりタグ単位の重みが変動し、細粒度のパーソナライズに活用。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| user_id | VARCHAR(25) | FK → user, NOT NULL | |
| tag_id | INTEGER | FK → tag, NOT NULL | |
| weight | NUMERIC(5,2) | NOT NULL, DEFAULT 1.00 | パーソナライズ重み |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (user_id, tag_id)

---

### user_action

ユーザーと記事の組み合わせで1レコード。行動をフラグで管理し、リンクメモも保持。パーソナライズのweight計算に使用。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| user_id | VARCHAR(25) | FK → user, NOT NULL | |
| content_id | INTEGER | FK → content, NOT NULL | |
| is_clicked | BOOLEAN | NOT NULL, DEFAULT false | クリック済み |
| clicked_at | TIMESTAMPTZ | NULL | クリック日時 |
| is_bounced | BOOLEAN | NOT NULL, DEFAULT false | バウンス（早期帰還） |
| bounced_at | TIMESTAMPTZ | NULL | バウンス日時 |
| is_bookmarked | BOOLEAN | NOT NULL, DEFAULT false | ブックマーク済み |
| bookmarked_at | TIMESTAMPTZ | NULL | ブックマーク日時 |
| memo | VARCHAR(1000) | NULL | リンクメモ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (user_id, content_id)
**INDEX**: (user_id, is_bookmarked) — ブックマーク一覧取得
**INDEX**: (user_id, is_clicked, clicked_at) — 閲覧履歴取得

---

### delivery_batch

コンテンツ配信バッチ。日次バッチで全カテゴリ × 全配信モードの組み合わせで一括生成。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | SERIAL | PK | |
| delivery_mode | VARCHAR(20) | NOT NULL | 配信モード（trend / deep / casual / discovery / omakase） |
| category_pattern | VARCHAR(200) | NOT NULL | カテゴリ組み合わせ（例: "technology,business"） |
| executed_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | バッチ実行日時 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**INDEX**: (executed_at)

### delivery_batch_item

配信バッチに含まれる個別コンテンツ。表示順を保持。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| delivery_batch_id | INTEGER | FK → delivery_batch, NOT NULL | |
| content_id | INTEGER | FK → content, NOT NULL | |
| position | SMALLINT | NOT NULL | 表示順 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (delivery_batch_id, content_id)

### weekly_ranking

週次人気記事ランキング。過去アーカイブとして閲覧可能。カテゴリはcontentから参照。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| content_id | INTEGER | FK → content, NOT NULL | |
| week_start | DATE | NOT NULL | 集計週の開始日（月曜） |
| rank_position | SMALLINT | NOT NULL | 順位 |
| bookmark_count | INTEGER | NOT NULL | 集計時点のはてブ数 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| updated_by | VARCHAR(25) | FK → user, NULL | 更新者 |
| deleted_at | TIMESTAMPTZ | NULL | 論理削除日時 |

**PK**: (content_id, week_start)

---

## インデックス一覧

| テーブル | カラム | 種別 | 目的 |
|---------|--------|------|------|
| user | email | UNIQUE | ログイン検索 |
| account | (provider, provider_account_id) | UNIQUE | OAuth認証 |
| session | session_token | UNIQUE | セッション検索 |
| code_master | (category, code_value, valid_from) | UNIQUE | コード一意制約 |
| content | url | UNIQUE | 重複排除 |
| feed_source | url | UNIQUE | ソース重複排除 |
| domain_banlist | domain | UNIQUE | ブロックドメイン一意制約 |
| user_domain_block | (user_id, domain) | PK | ユーザー別ドメインブロック |
| category | slug | UNIQUE | カテゴリ検索 |
| category | parent_id | INDEX | 子カテゴリ取得 |
| content | category_id | INDEX | カテゴリ別記事取得 |
| tag | name | UNIQUE | タグ検索 |
| user_setting | user_id | UNIQUE | ユーザー設定の一意制約 |
| user_action | (user_id, is_bookmarked) | INDEX | ブックマーク一覧取得 |
| user_action | (user_id, is_clicked, clicked_at) | INDEX | 閲覧履歴取得 |
| delivery_batch | executed_at | INDEX | 実行日時検索 |
| weekly_ranking | week_start | INDEX | 週別ランキング取得 |
