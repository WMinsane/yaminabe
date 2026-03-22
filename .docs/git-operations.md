# Git運用規約

## ブランチ戦略（Git Flow）

### ブランチ一覧

| ブランチ | 用途 | 派生元 | マージ先 |
|---------|------|--------|---------|
| `main` | リリース済みの安定版 | — | — |
| `develop` | 開発の統合ブランチ | `main` | `main`（リリース時） |
| `feature/*` | 機能開発 | `develop` | `develop` |
| `mock/*` | UIモック作成・改善 | `develop` | `develop` |
| `hotfix/*` | リリース後の緊急修正 | `main` | `main` + `develop` |

### 命名規則

```
feature/{フェーズ番号}-{概要}    例: feature/7-feed-display
mock/{画面名}                   例: mock/feed-screen
hotfix/{概要}                   例: hotfix/auth-token-expiry
```

### 運用ルール

- `main` への直接コミット禁止
- `develop` への直接コミットは軽微なドキュメント修正のみ許可
- feature / mock ブランチは作業完了後に削除

---

## コミット規約（Conventional Commits）

### フォーマット

```
{type}: {概要}
```

### type一覧

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `refactor` | リファクタリング（機能変更なし） |
| `test` | テストの追加・修正 |
| `chore` | ビルド・設定・依存関係等 |
| `style` | フォーマット修正（コードの意味に影響なし） |

---

## マージ方針

| 操作 | 方式 | 理由 |
|------|------|------|
| feature → develop | merge commit | 開発経緯をコミット単位で残す |
| mock → develop | merge commit | 同上 |
| develop → main | merge commit | リリース単位の統合を明示 |
| hotfix → main / develop | merge commit | 修正経緯を残す |

---

## リリースフロー

1. `develop` で全機能の統合・動作確認が完了
2. `develop` → `main` にmerge commit
3. `main` にバージョンタグを付与（`v{メジャー}.{マイナー}.{パッチ}`）
4. デプロイ実行

### タグ規則

- MVP: `v0.1.0`
- 以降: セマンティックバージョニングに準拠
