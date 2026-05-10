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
│  │  1. collect_all.py（はてブ・Qiita・Zenn・GIGAZINE）│  │
│  │  2. register.py（DB登録・ルールベース分類）     │  │
│  │  3. autotag.py（Gemini APIカテゴリ分類）        │  │
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
| 認証 | カスタムセッション（session.ts） | カスタムセッション（session.ts） |
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
| `RESEND_API_KEY` | メール送信 | 不要（コンソール出力） | Resend APIキー |
| `GEMINI_API_KEY` | Gemini API（バッチ用） | APIキー | GitHub Secrets (`GEMINI_API_KEY`) |
| `BATCH_DATABASE_URL` | バッチ用DB接続（GitHub Actions） | — | GitHub Secrets |

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

```json
// vercel.json（リポジトリルートに配置）
{
  "buildCommand": "npm run build -- --filter=web",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

monorepo構成のため、vercel.jsonでビルド設定を明示。Root Directoryは未設定（リポジトリルート）。マイグレーションはビルドに含めず、スキーマ変更時にローカルから `DIRECT_URL` 経由で手動実行する。

### GitHub Actions: 日次バッチ

```yaml
# .github/workflows/batch-daily.yml
name: Daily Batch - Collect & Classify

on:
  schedule:
    - cron: '0 21 * * *'  # UTC 21:00 = JST 06:00
  workflow_dispatch:       # 手動実行も可能

jobs:
  batch:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: batch
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: batch/requirements.txt
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Collect articles
        run: python collect_all.py
      - name: Register to DB
        env:
          DATABASE_URL: ${{ secrets.BATCH_DATABASE_URL }}
        run: python register.py
      - name: Auto-classify (autotag)
        if: success()
        env:
          DATABASE_URL: ${{ secrets.BATCH_DATABASE_URL }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: python autotag.py
```

- `BATCH_DATABASE_URL`: SupabaseのSession Pooler接続文字列（GitHub Secretsで管理）
- `GEMINI_API_KEY`: Gemini APIキー（GitHub Secretsで管理）
- `workflow_dispatch`: 手動トリガーも可能（デバッグ・緊急実行用）
- `timeout-minutes: 15`: 収集＋登録＋LLM分類の合計時間

---

## DBマイグレーション

### 開発環境

```bash
cd packages/db
npx prisma migrate dev --name <migration_name>
```

### 本番デプロイ時

マイグレーションはVercelビルドに含めず、スキーマ変更時にローカルから手動実行する。

```bash
# ローカルから本番DBにマイグレーション適用
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
```

- Vercelビルド環境からはTransaction Pooler（port 6543）経由で接続するが、pgbouncer経由ではマイグレーション不可
- `DIRECT_URL`（Session Pooler, port 5432）を使用してローカルから直接適用
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
| Secure Cookie | session.tsでCookie設定（`secure: true`, `httpOnly: true`, `sameSite: lax`） |
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
3. vercel.jsonで設定（Build Command / Install Command / Output Directory）
4. Root Directoryは未設定（リポジトリルート）

### 3. 環境変数設定（Vercel）

```
DATABASE_URL=postgresql://...@...:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://...@...:5432/postgres?sslmode=require
RESEND_API_KEY=<Resendダッシュボードから取得>
```

### 4. DBマイグレーション（ローカルから実行）

```bash
DATABASE_URL="<DIRECT_URL>" npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
python batch/seed_categories.py  # カテゴリマスタ初期投入（冪等）
```

### 5. 初回デプロイ

1. `main` ブランチにpush
2. Vercelが自動ビルド（マイグレーションは含まない）
3. デプロイ後の動作確認

### 6. GitHub Actions設定

1. Repository Settings → Secrets and variables → Actions
2. `BATCH_DATABASE_URL`: Supabase Session Pooler接続文字列
3. `GEMINI_API_KEY`: Gemini APIキー
4. `.github/workflows/batch-daily.yml` をコミット

### 7. 動作確認チェックリスト

- [ ] Vercelデプロイ成功
- [ ] ページ表示（フィード・設定・ライブラリ・ランキング）
- [ ] ログイン・ログアウト
- [ ] 設定変更の永続化
- [ ] GitHub Actions手動実行（workflow_dispatch）
- [ ] バッチ実行後のフィード更新確認
