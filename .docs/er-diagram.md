# ER図

## 凡例（Crow's Foot記法）

| 記号 | 意味 | 説明 |
|------|------|------|
| `──\|` | 1（必須） | 対応するレコードが必ず1つ存在する |
| `──\|\|` | 1のみ（必須） | 対応するレコードが必ず1つだけ存在する |
| `──○` | 0または1 | 対応するレコードが存在しない場合がある |
| `──<` (fork) | 多（1以上） | 対応するレコードが1つ以上存在する |
| `──○<` | 多（0以上） | 対応するレコードが0件の場合もある |

読み方の例:
- `user ||--o{ user_action` → userは必ず1つ存在し、user_actionは0件以上
- `user ||--|| user_setting` → 双方必ず1つずつ存在する

**共通カラム（アプリ独自テーブル全てに存在、ER図では省略）:** created_at, updated_at, updated_by, deleted_at

**色分け（SVG上）:** 認証関連テーブル = オレンジ系背景 / アプリ独自テーブル = 紫系背景

## Mermaid記法

```mermaid
%%{init: {"er": {"useMaxWidth": true, "fontSize": 12, "entityPadding": 30, "minEntityWidth": 400}, "theme": "default"}}%%
erDiagram
    user ||--o{ account : "OAuth紐付け"
    user ||--o{ session : "ログインセッション"
    user ||--|| user_setting : "ユーザー設定"
    user ||--o{ user_category : "興味カテゴリ"
    user ||--o{ user_tag : "興味タグ"
    user ||--o{ user_action : "行動記録"

    category ||--o{ category : "親子関係"
    category ||--o{ user_category : "ユーザー選択"
    category ||--o{ content : "記事分類"

    tag ||--o{ content_tag : "記事タグ付け"
    tag ||--o{ user_tag : "ユーザー興味"

    feed_source ||--o{ content : "記事収集"
    content ||--o{ content_tag : "タグ紐付け"
    content ||--o{ user_action : "行動対象"
    content ||--o{ delivery_batch_item : "配信対象"
    content ||--o{ weekly_ranking : "ランキング対象"

    delivery_batch ||--o{ delivery_batch_item : "配信コンテンツ"

    %% === 認証関連テーブル ===
    user {
        VARCHAR(25) id PK
        VARCHAR(100) name
        VARCHAR(255) email UK
        TIMESTAMPTZ email_verified
        VARCHAR(500) image
        VARCHAR(255) password_hash
        VARCHAR(10) plan
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    account {
        VARCHAR(25) id PK
        VARCHAR(25) user_id FK
        VARCHAR(20) type
        VARCHAR(50) provider
        VARCHAR(255) provider_account_id
        TEXT refresh_token
        TEXT access_token
        INTEGER expires_at
        VARCHAR(50) token_type
        VARCHAR(255) scope
        TEXT id_token
    }

    session {
        VARCHAR(25) id PK
        VARCHAR(25) user_id FK
        VARCHAR(255) session_token UK
        TIMESTAMPTZ expires
    }

    verification_token {
        VARCHAR(255) identifier
        VARCHAR(255) token UK
        TIMESTAMPTZ expires
    }

    %% === アプリ独自テーブル（共通カラム省略） ===
    code_master {
        SERIAL id PK
        VARCHAR(30) category
        VARCHAR(20) code_value
        VARCHAR(50) code_label
        SMALLINT sort_order
        DATE valid_from
        DATE valid_to
    }

    category {
        SERIAL id PK
        INTEGER parent_id FK
        VARCHAR(50) name UK
        VARCHAR(30) slug UK
        VARCHAR(200) description
    }

    tag {
        SERIAL id PK
        VARCHAR(100) name UK
    }

    feed_source {
        SERIAL id PK
        VARCHAR(100) name
        VARCHAR(500) url UK
        VARCHAR(20) type
        BOOLEAN is_active
        TIMESTAMPTZ last_fetched_at
    }

    domain_banlist {
        SERIAL id PK
        VARCHAR(255) domain UK
        VARCHAR(500) reason
    }

    content {
        SERIAL id PK
        VARCHAR(2000) url UK
        VARCHAR(500) title
        VARCHAR(100) source
        INTEGER category_id FK
        INTEGER feed_source_id FK
        VARCHAR(200) author
        TEXT summary
        INTEGER bookmark_count
        JSONB meta
        TIMESTAMPTZ published_at
        TIMESTAMPTZ collected_at
    }

    content_tag {
        INTEGER content_id PK
        INTEGER tag_id PK
    }

    user_setting {
        SERIAL id PK
        VARCHAR(25) user_id FK
        VARCHAR(20) delivery_mode
        SMALLINT omakase_level
        VARCHAR(10) display_mode
        VARCHAR(20) excerpt_style
    }

    user_category {
        VARCHAR(25) user_id PK
        INTEGER category_id PK
        NUMERIC(5_2) weight
    }

    user_tag {
        VARCHAR(25) user_id PK
        INTEGER tag_id PK
        NUMERIC(5_2) weight
    }

    user_action {
        VARCHAR(25) user_id PK
        INTEGER content_id PK
        BOOLEAN is_clicked
        TIMESTAMPTZ clicked_at
        BOOLEAN is_bounced
        TIMESTAMPTZ bounced_at
        BOOLEAN is_bookmarked
        TIMESTAMPTZ bookmarked_at
        VARCHAR(1000) memo
    }

    delivery_batch {
        SERIAL id PK
        VARCHAR(20) delivery_mode
        VARCHAR(200) category_pattern
        TIMESTAMPTZ executed_at
    }

    delivery_batch_item {
        INTEGER delivery_batch_id PK
        INTEGER content_id PK
        SMALLINT position
    }

    weekly_ranking {
        INTEGER content_id PK
        DATE week_start PK
        SMALLINT rank_position
        INTEGER bookmark_count
    }
```
