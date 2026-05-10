# アーキテクチャ仕様書

## 概要

エコーチェンバー脱却型コンテンツキュレーションアプリ「闇鍋」のシステム構成。

## システム構成

```mermaid
flowchart TD
    subgraph View["View（プレゼンテーション層）"]
        RC["React Client Components\n（UI表示・ユーザー操作）"]
    end

    subgraph Controller["Controller（制御層）"]
        SC["Server Components\n（データ取得・表示制御）"]
        SA["Server Actions\n（データ更新・バリデーション）"]
    end

    subgraph BizLogic["ビジネスロジック層"]
        SV["Services\n（ドメインロジック）"]
        AU["カスタムセッション認証\n（session.ts）"]
        RS["Resend\n（メール送信）"]
        ORM["Prisma\n（データアクセス）"]
    end

    subgraph ExtBatch["Python 日次バッチ"]
        B1["コンテンツ収集\n（はてブAPI・RSS）"]
        B1R["DB登録\n（UPSERT・ルールベース分類）"]
        B2["カテゴリ自動付与\n（未分類記事のLLM分類）"]
        LLM["Gemini API\n（カテゴリ分類）"]
    end

    RC -->|HTTP| SC & SA
    SC & SA --> SV
    SV --> ORM
    RS -.->|SMTP| Mail(("メール"))
    ORM -->|SQL| DB[("Supabase\nPostgreSQL")]
    B1 --> B1R
    B1R --> B2
    B2 --> LLM
    LLM -->|API| LLMAPI(("Gemini API"))
    ExtBatch -->|SQL| DB
```

※ API Routesは使用しない（外部公開APIなし）
※ React Native (Expo) は将来対応。MVP時点ではWeb版のみ

## monorepo構成

```
yaminabe/
├── apps/
│   ├── web/                 ← Next.js (Web版)
│   └── mobile/              ← React Native / Expo（将来対応）
├── batch/                   ← Python 日次バッチ
├── packages/
│   ├── db/                  ← Prisma（スキーマ管理・マイグレーション）
│   └── shared/              ← 共有ロジック（型定義・ユーティリティ）
├── docker-compose.yml       ← 開発用PostgreSQLコンテナ
├── turbo.json
└── package.json
```

※ MVP時点ではWeb版のみ。mobile/は将来対応

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| Web フロントエンド | Next.js (React) | 16.2 (React 19) |
| モバイル フロントエンド | React Native (Expo)（将来対応） | — |
| サーバーサイド | Server Components / Server Actions | — |
| 日次バッチ | Python（収集・DB登録・カテゴリ自動付与） | 3.12 |
| 認証 | カスタムセッション認証（NextAuth互換スキーマ） | — |
| セッション管理 | DBセッション（sessionテーブル + crypto.randomUUID） | — |
| メール送信 | Resend（パスワードリセット） | — |
| データベース | Supabase PostgreSQL | — |
| ORM | Prisma | 6.9 |
| バリデーション | Zod（MVP未導入） | — |
| 状態管理 | useState / useContext（Zustand: MVP未導入） | — |
| CSS | Tailwind CSS | 4.2 |
| カテゴリ自動付与（LLM） | Gemini 2.5 Flash-Lite（Google AI） | — |
| monorepo管理 | Turborepo | 2.8 |

## 認証方式

### 技術選定根拠

| 選定項目 | 採用 | 理由 |
|---------|------|------|
| 認証方式 | Email + Password（カスタム実装） | MVP最小構成。NextAuth v5はCredentials+DBセッション非対応のため自前実装。スキーマはNextAuth互換（将来のNextAuth/OAuth移行に備える） |
| セッション管理 | DBセッション（sessionテーブル） | サーバー側でセッション無効化が可能。JWTではrevoke不可 |
| セッションID保持 | Cookie（セッショントークンのみ） | `crypto.randomUUID()`で生成。HttpOnly/Secure/SameSite=Lax。Cookie名: `yaminabe_session` |
| セッション有効期間 | 7日間 | `MAX_AGE = 60 * 60 * 24 * 7` |
| ルート保護 | proxy.ts（Next.js 16 proxy convention） | Cookie有無でリダイレクト制御。middleware.tsはNext.js 16で非推奨 |
| メール送信 | Resend | パスワードリセット専用。低コスト・API簡潔。開発環境はコンソールログ |

### 暗号・ハッシュ方式

| 用途 | 分類 | 方式 | 備考 |
|------|------|------|------|
| パスワード保存 | ハッシュ | bcrypt（ソルト + ストレッチング10ラウンド） | SHA-256は高速すぎてブルートフォースに弱いため不採用 |
| HTTPS通信 | 暗号化 | TLS 1.3（AES-256-GCM） | Vercel / Supabase が自動適用。アプリ層で直接扱わない |
| セッションID生成 | 乱数生成 | crypto.randomUUID()（UUIDv4, 122bit） | sessionテーブルに保存、Cookieで保持 |
| パスワードリセットトークン | 乱数生成 | crypto.randomBytes(32) | 有効期限10分。verification_tokenテーブル管理 |

## カテゴリ自動付与方式

### 技術選定根拠

| 選定項目 | 採用 | 理由 |
|---------|------|------|
| 方式 | ルールベース分類 + LLM APIによるカテゴリ分類 | 2段階で精度とコストを両立 |
| ルールベース | register.py（タグ・ソース・タイトルから分類） | 明確なケースをLLM呼び出し前に処理 |
| LLM分類 | Gemini 2.5 Flash-Lite（autotag.py） | 低コスト（MVP規模なら無料枠内）。日本語対応 |
| 切替候補 | Claude Haiku 4.5 / GPT-4o-mini | サービス停止時に環境変数のみで切替可能 |

### 分類フロー

```
1. register.py: ルールベース分類（タグ → ソース名 → タイトルキーワード）
   → 分類できた記事は category_id を設定してINSERT
   → 分類できなかった記事は category_id = NULL でINSERT
2. autotag.py: LLMカテゴリ分類（未分類記事のみ対象）
   → category_id IS NULL の記事をバッチでGemini APIに送信
   → 子カテゴリIDを返却 → content.category_id を更新
```

### LLMアダプタパターン（将来対応）

特定のLLMサービスへの依存を回避するため、共通インターフェースでプロバイダ差異を吸収する設計を予定。MVP段階ではGemini APIを直接呼び出し。

### タグ体系

- Qiita記事のタグはcontent_tagに自動登録（register.pyで処理）
- その他ソースのタグ抽出は将来対応

### コスト見込み

| 規模 | Gemini Flash-Lite | Claude Haiku 4.5 | GPT-4o-mini |
|------|-------------------|------------------|-------------|
| 100記事/日 | 無料枠内 | 約¥15/月 | 約¥3/月 |
| 500記事/日 | 約¥3/月 | 約¥75/月 | 約¥15/月 |

## 非機能要件

### セキュリティ

| 脅威 | 対策 | 実現方法 |
|------|------|---------|
| SQLインジェクション | パラメータバインド | Prisma ORM（生SQLを使用しない） |
| XSS | 自動エスケープ | React DOM自動エスケープ + CSPヘッダー |
| CSRF | トークン検証 | MVP段階では未実装。Server ActionsはPOST + Same-Originで基本的に保護。将来Double Submit Cookie導入予定 |
| セッションハイジャック | Secure Cookie + HttpOnly | session.tsでCookie設定（secure: true, httpOnly: true, sameSite: lax）。本番環境はHTTPS必須 |
| パスワード漏洩 | ハッシュ保存 | bcrypt（平文保存しない） |
| 認可バイパス | データアクセス制御 | Prisma where句でユーザーIDフィルタリング必須 |

### パフォーマンス

| 指標 | 目標値 | 実現方針 |
|------|--------|---------|
| 初回ページ表示（LCP） | < 2秒 | SSR（Server Components） |
| ページ遷移 | < 500ms | Next.js App Router プリフェッチ |
| API応答 | < 300ms (p95) | DB接続プール（Prisma） |
| 日次バッチ | < 10分 | 並列取得 + バルクインサート |

### 可用性

MVP時点ではSLA目標値を設定しない。Vercel + Supabase のマネージドサービスに依存。

## インフラ構成

### ランタイム環境

| ランタイム | バージョン | 用途 |
|-----------|-----------|------|
| Node.js | 20 LTS | Next.js アプリケーション |
| Python | 3.12 | 日次バッチ |

### 環境一覧

| 環境 | Web | バッチ | DB | 備考 |
|------|-----|--------|-----|------|
| 開発 | localhost (next dev) | ローカル実行 | Docker PostgreSQL 16 (ローカル) | docker compose up -d で起動 |
| 本番 | Vercel | GitHub Actions (cron) | Supabase (prod project) | Edge Functions未使用 |

### 環境分離

```
開発環境: .env.local → Docker PostgreSQL (localhost:5432)
本番環境: Vercel Environment Variables → Supabase prod project
```

※ 環境変数管理・デプロイ手順の詳細は `.docs/deploy-strategy.md` を参照
