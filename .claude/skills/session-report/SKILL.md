---
name: session-report
description: フェーズ終了時にセッションJSONLを解析し、計測5軸のレポートを出力する。
disable-model-invocation: true
user-invocable: true
argument-hint: "[フェーズ名]"
allowed-tools: Read, Bash, Grep, Glob, Write
---

# セッションレポート

フェーズ: $ARGUMENTS

## データソース
`~/.claude/projects/-home-user-claude-test-yaminabe/` 配下の現在のセッションJSONLファイル。

## 集計する5軸

### 1. ラリー数
- セッションJSONLからrole=userのメッセージ数をカウント

### 2. 指示分量
- role=userの全メッセージの合計文字数

### 3. 手戻り率
- Edit/Writeツールの実行を抽出
- 同一ファイルへの複数回Editを検出
- 変更行数 / 新規行数 を算出

### 4. 手戻り原因分類
- rejectイベント（ユーザーがツール実行を拒否）の回数
- ユーザー起因（指示変更・追加要件）/ Claude起因（判断ミス・見落とし）に分類
- 分類が困難な場合は「不明」とする

### 5. トークン効率
- Edit/Writeで生成された行数（コード+ドキュメント）を集計
- セッションのトークン消費量を取得
- 生成行数 / トークン消費量 を算出

## 出力フォーマット

```
# セッションレポート — {フェーズ名}
日時: {YYYY-MM-DD}

| 観点 | 値 |
|---|---|
| ラリー数 | {N}回 |
| 指示分量 | {N}文字 |
| 手戻り率 | {N}% (変更{N}行 / 新規{N}行) |
| 手戻り原因 | ユーザー起因{N}件 / Claude起因{N}件 / 不明{N}件 |
| トークン効率 | {N}行 / {N}トークン |

## 手戻り詳細
{同一ファイルへの複数Edit、reject一覧}

## 所見
{特筆すべき傾向があれば記載}
```

## 保存先
出力結果を `.user-eval/{連番3桁}_{フェーズ名}_session_report.md` に保存する。
