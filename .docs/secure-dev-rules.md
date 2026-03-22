# 開発時セキュリティ対策 (secure-dev-rules)

## 概要

本プロジェクトでは、安全な開発環境を実現するために多層防御のセキュリティ方針を採用する。

---

## 1. DevContainer（コンテナ隔離）— 第1層

**目的**: ホスト環境からの完全な隔離、他ディレクトリへの影響防止

| 項目 | 内容 |
|------|------|
| 設定ファイル | `.devcontainer/` |
| 構成 | Docker Compose統合型（将来のDB追加に対応） |
| ファイアウォール | `init-firewall.sh` によるdefault-denyポリシー |
| ネットワーク | ホワイトリスト方式（GitHub, npm, Anthropic API等のみ許可） |
| ファイルシステム | `/workspace` にバインドマウント、ホスト他領域へのアクセス不可 |

### 許可ドメイン一覧
- `github.com` / `api.github.com`（Git操作）
- `registry.npmjs.org`（パッケージ管理）
- `api.anthropic.com`（Claude API）
- `sentry.io`（エラー監視）
- `statsig.anthropic.com` / `statsig.com`（機能フラグ）
- `marketplace.visualstudio.com` / `vscode.blob.core.windows.net`（VSCode拡張）

---

## 2. sandbox有効化 — 第2層

**目的**: コンテナ内でのClaude Codeの動作をさらに制限

- Bashコマンドのファイルシステム・ネットワーク隔離
- `/sandbox` コマンドで有効化
- `allowedDomains` によるアクセス制限は**今回は行わない**（DevContainerのファイアウォールで代替）

---

## 3. 権限設定（`.claude/settings.json`）— 第3層

### 3.1 deny（明示的に禁止）

| カテゴリ | ルール | 理由 |
|---------|--------|------|
| 破壊コマンド | `Bash(rm -rf *)`, `Bash(sudo *)` | 誤操作防止 |
| 外部通信 | `Bash(curl *)`, `Bash(wget *)` | 意図しない通信防止 |
| 権限バイパス | `Bash(* --dangerously-skip-permissions *)` | セキュリティ回避防止 |
| 機密ファイル読取 | `Read(**/.env)`, `Read(**/.env.*)`, `Read(**/credentials*)`, `Read(**/*secret*)` | 機密情報漏洩防止 |
| 機密ファイル編集 | `Edit(**/.env)`, `Write(**/.env)` 等 | 機密ファイルの改変防止 |

### 3.2 dangerously-skip-permissions の無効化

- `permissions.deny` で `--dangerously-skip-permissions` を含むコマンドをブロック
- チーム開発でないため ManagedSettings による制御は行わない

---

## 4. preToolUse Hook（`.claude/hooks/block-dangerous-commands.sh`）— 第4層

**目的**: Bashコマンド実行前に危険な文字列パターンを検出しブロック

### ブロック対象パターン

| パターン | 理由 |
|---------|------|
| `prod` / `production` | 本番環境への誤操作防止 |
| `rm -rf /` | ルートディレクトリ削除防止 |
| `mkfs` / `dd if=` | ディスク破壊防止 |
| `:(){:\|:&};:` | fork bomb防止 |
| `chmod -R 777` | 権限の過剰付与防止 |
| `DROP DATABASE` / `DROP TABLE` / `TRUNCATE` | DB破壊防止 |
| `--dangerously-skip-permissions` | セキュリティ回避防止 |
| `force-push` / `push.*--force` | Git履歴の強制上書き防止 |

### 動作仕様
- exit 0: コマンド許可
- exit 2: コマンドブロック（stderr経由で理由をClaudeに通知）

---

## 5. パッケージインストール制約

| 操作 | 許可 | 理由 |
|------|:---:|------|
| `npm install`（プロジェクトローカル） | ○ | sandbox内で完結 |
| `npm install --save-dev`（devDependencies） | ○ | sandbox内で完結 |
| `npm install -g`（グローバル） | **×** | sandbox外にファイルを書き込む。セキュリティ方針に違反 |
| `npx -y {package}` | ○ | 一時ダウンロード実行。永続的な変更なし |

**原則**: プロジェクト外への書き込みを伴うインストールは一切禁止。`npx` またはプロジェクトローカルインストールで代替する。

---

## 6. 今回スコープ外とした項目

| 項目 | 理由 |
|------|------|
| `sandbox > allowedDomains` | DevContainerファイアウォールで代替 |
| ManagedSettings | チーム開発でないため不要 |

---

## 防御層まとめ

```
[第1層] DevContainer + Firewall
  └─ ホスト隔離、ネットワーク制限（default-deny）

  [第2層] sandbox
    └─ コンテナ内でのBashコマンドのファイルシステム・ネットワーク隔離

    [第3層] permissions (settings.json)
      └─ ツール単位のallow/deny制御、機密ファイルアクセス制御

      [第4層] preToolUse Hook
        └─ コマンド文字列の動的検査、危険パターンのリアルタイムブロック
```
