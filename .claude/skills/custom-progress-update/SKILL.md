---
name: custom-progress-update
description: schedule.mdのチェックボックスと記述を現状に合わせて更新し、ganttチャートSVG+HTMLを再生成する。
user-invocable: true
argument-hint: "[更新内容の補足]"
allowed-tools: Read, Edit, Bash, Glob
---

# スケジュール更新

対象: $ARGUMENTS

## 1. 現状把握

- `.docs/schedule.md` を読み込み、チェックボックス状態を確認
- `.docs/` 配下のドキュメント存在・完成度を確認
- 直近のセッションで完了・変更されたタスクを特定

## 2. schedule.md 更新

以下を更新する:
- チェックボックス（`[ ]` → `[x]`）を実態に合わせる
- タスク記述の修正（仕様変更で記載が古くなった箇所）
- 工程名・タスク名の更新（必要な場合のみ）

**ルール:**
- 完了していないタスクを完了にしない
- タスクの追加・削除はユーザー確認を取る
- 変更箇所を一覧で提示してからEditを実行する

## 3. ganttチャートSVG再生成

schedule.mdの内容に合わせてMermaid ganttチャートを更新する:

```bash
# ganttチャートの.mmdファイルを生成（内容はschedule.mdの工程・期間に合わせて都度作成）
npx -y @mermaid-js/mermaid-cli -i /tmp/schedule-gantt.mmd -o "/mnt/c/Users/mnwka/OneDrive/ドキュメント/2026/20260317_yami/docs/schedule-gantt.svg" -t default
```

ganttチャートの状態表現:
- 完了タスク: `done`
- 進行中タスク: `active`
- 未着手タスク: （指定なし）
- マイルストーン: `milestone`

## 4. HTML再生成・配置

```bash
pandoc .docs/schedule.md -f markdown -t html -s --metadata title="スケジュール" -c "data:text/css,body{max-width:900px;margin:2em auto;padding:0 1.5em;font-family:sans-serif;line-height:1.6}table{width:100%25;border-collapse:collapse}th,td{border:1px solid %23ccc;padding:8px}th{background:%23f5f5f5}" -o "/mnt/c/Users/mnwka/OneDrive/ドキュメント/2026/20260317_yami/docs/schedule.html"
```

生成後、schedule.htmlの`<h1 id="スケジュール">`直下にgantt SVGのimgタグを埋め込む:
```html
<div style="margin: 20px 0; overflow-x: auto;">
<img src="schedule-gantt.svg" alt="MVPスケジュール ガントチャート" style="max-width: 100%; height: auto;" />
</div>
```

## 5. 更新サマリ

更新内容を簡潔に報告する:
- 変更したチェックボックスの数
- 記述を修正した箇所
- gantt/HTML再生成の成否
