# アーキテクチャ仕様書

## 概要

エコーチェンバー脱却型コンテンツキュレーションアプリ「闇鍋」のシステム構成。

## システム構成

```
┌─────────────────────────────────────────────────────────┐
│                     クライアント                         │
│  ┌───────────────────────────────────────────┐          │
│  │  Next.js (Web版)                          │          │
│  │  ├── Server Components (データ取得・表示)  │          │
│  │  └── Server Actions (データ更新)           │          │
│  └──────────────────────┬────────────────────┘          │
│                         │                               │
│  ※ React Native (Expo) は将来対応。MVP時点ではWeb版のみ  │
└─────────────────────────┼───────────────────────────────┘
                          │ Prisma
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase                               │
│  └── PostgreSQL (データ永続化)                           │
└─────────────────────────┬───────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│  NextAuth (Auth.js)  │  │  Python 日次バッチ            │
│  ├── Credentials     │  │  ├── コンテンツ収集            │
│  │   Provider        │  │  │   (はてブAPI・RSS)          │
│  ├── DBセッション     │  │  ├── タグ自動付与             │
│  └── Prisma Adapter  │  │  ├── IPW weight更新           │
├──────────────────────┤  │  └── カテゴリ・タグweight調整  │
│  Resend              │  └──────────────────────────────┘
│  └── パスワード       │
│      リセットメール   │
└──────────────────────┘
```

## レイヤー構成

```
[ページ/コンポーネント]  ← UI表示のみ
        ↓
[Server Components]  ← データ取得・表示
[Server Actions]     ← データ更新（ユーザー操作）
        ↓
[Services]  ← ビジネスロジック
        ↓
[Prisma]  ← DB操作
```

※ API Routesは使用しない（外部公開APIなし）

## 認証フロー

```
[Web]
  │
  ▼
[NextAuth (Auth.js) + Prisma Adapter]
  ├── Credentials Provider (Email + Password)
  └── OAuth Provider（将来: Google, Apple等）
  │
  ▼
[DBセッション（sessionテーブル管理）]
  ├── サーバー側でセッション無効化が可能
  └── Cookie にセッションIDのみ保持
  │
  ▼
[Prisma where句: ユーザーは自分のデータのみアクセス可能]
```

### パスワードリセット

```
[パスワードリセット要求]
  │
  ▼
[verification_tokenテーブルにトークン発行（有効期限10分）]
  │
  ▼
[Resend経由でリセットリンクをメール送信]
  │
  ▼
[リンク押下 → トークン検証 → パスワード変更画面]
```

## monorepo構成

```
yaminabe/
├── apps/
│   ├── web/                 ← Next.js (Web版)
│   └── mobile/              ← React Native / Expo（将来対応）
├── batch/                   ← Python 日次バッチ
├── packages/
│   └── shared/              ← 共有ロジック（型定義・ユーティリティ）
├── turbo.json
└── package.json
```

※ MVP時点ではWeb版のみ。mobile/は将来対応

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Web フロントエンド | Next.js (React) |
| モバイル フロントエンド | React Native (Expo)（将来対応） |
| サーバーサイド | Server Components / Server Actions |
| 日次バッチ | Python（収集・タグ付与・weight更新） |
| 認証 | NextAuth (Auth.js) + Credentials Provider + Prisma Adapter |
| セッション管理 | DBセッション（sessionテーブル） |
| メール送信 | Resend（パスワードリセット） |
| データベース | Supabase PostgreSQL |
| ORM | Prisma |
| バリデーション | Zod |
| 状態管理 | useState / useContext / Zustand |
| CSS | Tailwind CSS |
| monorepo管理 | Turborepo |
