---
name: tasks
description: .issue/ と .investigation/ のOpen・In Progress課題を一覧表示する。
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# 課題一覧

以下のディレクトリから **Open** および **In Progress** の課題を抽出し、一覧表示する。

## 対象ディレクトリ
- `.issue/`
- `.investigation/`

## 出力フォーマット

```
## Open ({件数})
| # | ファイル | タイトル | Type | Severity |
|---|---------|---------|------|----------|

## In Progress ({件数})
| # | ファイル | タイトル | Type | Severity |
|---|---------|---------|------|----------|

## サマリ
- Open: {件数}
- In Progress: {件数}
- Closed: {件数}
```

## ルール
- `Status: Closed` の課題は件数のみカウントし、一覧には含めない
- Severityが高い順に並べる（Critical > High > Medium > Low）
