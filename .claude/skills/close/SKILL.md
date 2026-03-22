---
name: close
description: 課題（.issue/ .investigation/）を完了させる時に使用する。完了条件の照合、検証、ドキュメントエスカレーション、Status更新を行う。
disable-model-invocation: true
user-invocable: true
argument-hint: "[ファイルパス]"
allowed-tools: Read, Edit, Grep, Glob, Bash
---

# 課題クローズ手順

対象ファイル: $ARGUMENTS

## 1. 完了条件の照合
- 対象ファイルを読み取り、「完了条件」セクションを特定する
- 各完了条件を1行ずつ列挙し、充足/未充足を判定する
- 未充足がある場合はクローズせず、未充足項目を報告して終了する

## 2. 検証の実行
- 該当する検証コマンド（テスト・lint・型チェック等）を実行する
- 実行結果を提示する
- 検証が失敗した場合はクローズせず、失敗内容を報告して終了する

## 3. ドキュメントエスカレーション確認
- この課題の解決によって以下に影響があるか確認する:
  - `CLAUDE.md` — プロジェクトルールの変更
  - `CONVENTIONS.md` — 命名規則・コード規約の変更
  - `.docs/architecture.md` — システム構成の変更
  - `.docs/spec.md` — 機能仕様の変更
  - `.docs/secure-dev-rules.md` — セキュリティ方針の変更
  - `.docs/content-sources.md` — コンテンツソース仕様の変更
- 影響がある場合、更新が必要なドキュメントと更新内容を提示する
- ユーザーの承認後にドキュメントを更新する

## 4. Status更新
- 対象ファイルの `**Status**:` を `Closed(YYYY-MM-DD)` に更新する
- 「実行結果」セクションを追記し、検証結果・変更内容のサマリを記載する
