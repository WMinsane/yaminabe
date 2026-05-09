# デプロイ戦略

## 概要

闇鍋のデプロイ構成を定義する。MVP段階ではマネージドサービスを活用し、運用コストを最小化する。

---

## インフラ構成

```
┌─────────────────────────────────────────────────────┐
│  Vercel                                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Next.js App (SSR + Server Actions)           │  │
│  │  - Server Components（フィード・設定等）        │  │
│  │  - Server Actions（データ更新）                │  │
│  │  - Static Assets（CSS・画像等）                │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │ Prisma (Connection Pool)   │
└─────────────────────────┼───────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────┐
│  Supabase               │                           │
│  ┌──────────────────────▼────────────────────────┐  │
│  │  PostgreSQL (本番DB)                           │  │
│  │  - Transaction Pooler (port 6543)             │  │
│  │  - Session Pooler (port 5432, migrate用)      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  GitHub Actions (cron)                              │
│  ┌───────────────────────────────────────────────┐  │
│  │  日次バッチ (Python)                           │  │
│  │  - コンテンツ収集（はてブAPI・RSS）             │  │
│  │  - タグ自動付与（Gemini API）                   │  │
│  │  - weight更新                                  │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │ psycopg2 (直接接続)        │
└─────────────────────────┼───────────────────────────┘
                          │
                          ▼ Supabase PostgreSQL
```

---

## 環境定義

| 項目 | 開発 (development) | 本番 (production) |
|------|-------------------|-------------------|
| Web | localhost:3001 (next dev) | Vercel (*.vercel.app) |
| DB | Docker PostgreSQL 16 (localhost:5433) | Supabase PostgreSQL |
| バッチ | ローカル手動実行 | GitHub Actions cron |
| 認証 | NextAuth (Credentials) | NextAuth (Credentials) |
| メール | コンソールログ出力 | Resend API |
| LLM | Gemini 2.5 Flash-Lite | Gemini 2.5 Flash-Lite |

---

## 環境変数管理

### 開発環境

`.env.local`（gitignore済み）で管理。`.env.example` をテンプレートとして提供。

### 本番環境

Vercel Environment Variables（Vercelダッシュボードで設定）。コードやリポジトリに秘匿情報を含めない。

### 環境変数一覧

| 変数名 | 用途 | 開発 | 本番 |
|--------|------|------|------|
| `DATABASE_URL` | Prisma接続（Transaction Pooler） | Docker PostgreSQL | Supabase pooler (6543) |
| `DIRECT_URL` | Prisma migrate用（Session Pooler） | 同上 | Supabase direct (5432) |
| `NEXTAUTH_SECRET` | NextAuthセッション暗号化キー | ランダム文字列 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | NextAuthコールバックURL | `http://localhost:3001` | Vercel自動設定 |
| `RESEND_API_KEY` | メール送信 | 不要（コンソール出力） | Resend APIキー |
| `GOOGLE_AI_API_KEY` | Gemini API（バッチ用） | APIキー | GitHub Secrets |
| `LLM_PROVIDER` | LLMアダプタ切替 | `gemini` | `gemini` |

### Prisma datasource設定

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- `DATABASE_URL`: Supabase Transaction Pooler（接続プール経由、Vercelサーバーレス向け）
- `DIRECT_URL`: Supabase Session Pooler（マイグレーション実行用）

---

## CI/CD

### Vercel自動デプロイ

| トリガー | 動作 | 環境 |
|---------|------|------|
| `main` ブランチへのpush/merge | Production Deploy | 本番 |
| Pull Request作成/更新 | Preview Deploy | プレビュー |

Vercelのデフォルト動作をそのまま利用する。Build Command は `turbo build` を自動検知。

### ビルドコマンド

```bash
# Vercel Build Settings
# Framework Preset: Next.js
# Root Directory: apps/web
# Build Command: cd ../.. && npx turbo build --filter=web
# Install Command: npm install
```

monorepo構成のため、Root Directoryを `apps/web` に設定し、Build Commandでルートからturboを実行する。

### GitHub Actions: 日次バッチ

```yaml
# .github/workflows/daily-batch.yml
name: Daily Content Collection

on:
  schedule:
    - cron: '0 18 * * *'  # JST 03:00（UTC 18:00前日）
  workflow_dispatch:       # 手動実行も可能

jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd batch
          pip install -r requirements.txt
      - name: Run collection
        env:
          DATABASE_URL: ${{ secrets.BATCH_DATABASE_URL }}
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
        run: |
          cd batch
          python collect_all.py
          python autotag.py
```

- `BATCH_DATABASE_URL`: SupabaseのSession Pooler接続文字列（GitHub Secretsで管理）
- `workflow_dispatch`: 手動トリガーも可能（デバッグ・緊急実行用）
- `timeout-minutes: 30`: Gemini APIレート制限を考慮

---

## DBマイグレーション

### 開発環境

```bash
cd packages/db
npx prisma migrate dev --name <migration_name>
```

### 本番デプロイ時

Vercelのビルドプロセス内でマイグレーションを実行する。

```bash
# Vercel Build Command（マイグレーション込み）
cd ../.. && npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && npx turbo build --filter=web
```

- `prisma migrate deploy`: 未適用のマイグレーションのみ適用（本番安全）
- `prisma migrate dev` は本番では使用しない（対話的操作が必要なため）

### ロールバック

Prismaはマイグレーションの自動ロールバックをサポートしない。問題発生時は:
1. 修正マイグレーションを新規作成
2. `prisma migrate deploy` で適用
3. 必要に応じてVercelの即時ロールバック（前回デプロイに戻す）を使用

---

## セキュリティ対応表

secure-dev-rules.md の4層防御と本番環境の対応。

| 開発環境（4層防御） | 本番環境での対応 |
|-------------------|----------------|
| DevContainer（ホスト隔離） | Vercelサーバーレス（コンテナ隔離） |
| sandbox（FS/NW隔離） | Vercel Serverless Functions（エフェメラル実行環境） |
| permissions（ツール制御） | N/A（CI/CD自動化、人手介入なし） |
| preToolUse Hook（危険コマンド検出） | N/A（ビルドスクリプト固定） |

### 本番環境固有のセキュリティ

| 対策 | 実現方法 |
|------|---------|
| HTTPS強制 | Vercel標準（全通信TLS 1.3） |
| CSPヘッダー | `next.config.ts` の `headers()` で設定 |
| Secure Cookie | NextAuth本番設定（`secure: true`, `httpOnly: true`, `sameSite: lax`） |
| 環境変数保護 | Vercel Environment Variables（暗号化保存、ログ非表示） |
| DB接続制限 | Supabase接続プール + SSL必須 |
| CORS | Next.js Server Actions（同一オリジン、CORS不要） |
| レート制限 | MVP段階では未実装。トラフィック増加時にVercel WAFまたはmiddlewareで対応 |

### CSPヘッダー設定方針

```typescript
// next.config.ts — headers()
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // Next.jsのインラインスクリプト用
    "style-src 'self' 'unsafe-inline'",   // Tailwind CSS用
    "img-src 'self' data: https:",        // 外部画像（OGP等）
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}
```

---

## 監視・ログ

### MVP段階

| 項目 | ツール | 備考 |
|------|--------|------|
| アクセス解析 | Vercel Analytics（無料枠） | Core Web Vitals自動計測 |
| エラー監視 | Vercel Logs | Vercelダッシュボードで確認 |
| DB監視 | Supabase Dashboard | クエリ統計・接続数・ストレージ |
| バッチ監視 | GitHub Actions Logs | 実行結果・エラーログ |

### 将来拡張（トラフィック増加時）

- Sentry導入（エラートラッキング・パフォーマンス監視）
- Vercel Speed Insights
- カスタムアラート（バッチ失敗通知 → Slack/メール）

---

## コスト見込み（MVP段階）

| サービス | プラン | 月額 |
|---------|--------|------|
| Vercel | Hobby（無料） | ¥0 |
| Supabase | Free tier | ¥0 |
| GitHub Actions | Free tier（2,000分/月） | ¥0 |
| Resend | Free tier（100通/日） | ¥0 |
| Gemini API | Free tier | ¥0 |
| **合計** | | **¥0** |

※ Vercel Hobbyプランは商用利用不可。有料ユーザー導入時はProプラン（$20/月）への移行が必要。

---

## デプロイ手順（初回）

### 1. Supabaseプロジェクト作成

1. Supabaseダッシュボードで新規プロジェクト作成
2. 接続文字列を取得（Transaction Pooler / Session Pooler）
3. SSL証明書を確認

### 2. Vercelプロジェクト作成

1. GitHubリポジトリをVercelにインポート
2. Framework Preset: Next.js
3. Root Directory: `apps/web`
4. Build Command: `cd ../.. && npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && npx turbo build --filter=web`
5. Install Command: `npm install`

### 3. 環境変数設定（Vercel）

```
DATABASE_URL=postgresql://...@...:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://...@...:5432/postgres?sslmode=require
NEXTAUTH_SECRET=<openssl rand -base64 32>
RESEND_API_KEY=<Resendダッシュボードから取得>
```

### 4. 初回デプロイ

1. `main` ブランチにpush
2. Vercelが自動ビルド + マイグレーション適用
3. デプロイ後の動作確認

### 5. GitHub Actions設定

1. Repository Settings → Secrets and variables → Actions
2. `BATCH_DATABASE_URL`: Supabase Session Pooler接続文字列
3. `GOOGLE_AI_API_KEY`: Gemini APIキー
4. `.github/workflows/daily-batch.yml` をコミット

### 6. 動作確認チェックリスト

- [ ] Vercelデプロイ成功
- [ ] ページ表示（フィード・設定・ライブラリ・ランキング）
- [ ] ログイン・ログアウト
- [ ] 設定変更の永続化
- [ ] GitHub Actions手動実行（workflow_dispatch）
- [ ] バッチ実行後のフィード更新確認
