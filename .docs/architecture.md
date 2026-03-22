# アーキテクチャ仕様書

## 概要

エコーチェンバー脱却型コンテンツキュレーションアプリ「闇鍋」のシステム構成。

## システム構成

```
┌─────────────────────────────────────────────────────────┐
│                     クライアント                         │
│  ┌───────────────┐    ┌───────────────────┐            │
│  │  Next.js       │    │  React Native     │            │
│  │  (Web版)       │    │  (Expo/iOS/Android)│            │
│  └───────┬───────┘    └────────┬──────────┘            │
│          │    共有ロジック       │                       │
│          │  (packages/shared)   │                       │
│          └──────────┬──────────┘                        │
└─────────────────────┼──────────────────────────────────┘
                      │ REST API / Server Actions
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Routes                     │
│  ├── /api/feed         (フィード取得・更新)              │
│  ├── /api/bookmark     (ブックマーク操作)                │
│  ├── /api/history      (閲覧履歴)                       │
│  ├── /api/preferences  (パーソナライズ設定)              │
│  └── /api/cron/collect (定時コンテンツ収集)              │
├─────────────────────────────────────────────────────────┤
│                    Services                             │
│  ├── feedService.ts          (フィード生成・配信)        │
│  ├── collectorService.ts     (コンテンツ収集)            │
│  ├── personalizationService.ts (パーソナライズエンジン)   │
│  ├── bookmarkService.ts      (ブックマーク管理)          │
│  ├── historyService.ts       (閲覧履歴管理)              │
│  └── subscriptionService.ts  (課金・プラン管理)          │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase                               │
│  └── PostgreSQL (データ永続化)                           │
└─────────────────────────────────────────────────────────┘
```

## レイヤー構成

```
[ページ/コンポーネント]  ← UI表示のみ
        ↓
[Server Actions / API Routes]  ← エンドポイント
        ↓
[Services]  ← ビジネスロジック
        ↓
[Supabase Client / Prisma]  ← DB操作
```

## 認証フロー

```
[Web / アプリ]
      │
      ▼
[NextAuth (Auth.js) + Prisma Adapter]
      ├── Email + Password
      ├── Google OAuth（将来）
      └── Apple Sign-In（将来）
      │
      ▼
[Cookie セッション（DB管理）]
      │
      ▼
[Prisma where句: ユーザーは自分のデータのみアクセス可能]
```

※認証フローの詳細設計（自動ログイン、セッション戦略等）はアプリ仕様策定時に決定

## monorepo構成

```
yaminabe/
├── apps/
│   ├── web/                 ← Next.js (Web版)
│   └── mobile/              ← React Native / Expo (アプリ版)
├── packages/
│   └── shared/              ← 共有ロジック（型定義・ユーティリティ）
├── turbo.json
└── package.json
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Web フロントエンド | Next.js (React) |
| モバイル フロントエンド | React Native (Expo) |
| バックエンド / API | Next.js API Routes |
| 認証 | NextAuth (Auth.js) + Prisma Adapter |
| データベース | Supabase PostgreSQL |
| ORM | Prisma |
| バリデーション | Zod |
| 状態管理 | useState / useContext / Zustand |
| CSS | Tailwind CSS |
| monorepo管理 | Turborepo |
