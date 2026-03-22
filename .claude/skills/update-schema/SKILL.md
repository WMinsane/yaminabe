---
name: update-schema
description: DB定義書とER図を同期更新する。テーブル・カラムの追加・変更・削除・型変更・リネーム時に使用。
user-invocable: true
argument-hint: "[変更内容の概要]"
allowed-tools: Read, Write, Edit, Bash, Glob
---

# DB定義書・ER図 同期更新

対象: $ARGUMENTS

## 1. 変更計画の提示

以下を明示してからユーザー承認を得る:
- 追加/変更/削除するテーブル・カラム
- 影響するリレーション
- ER図への影響

## 2. DB定義書の更新

`.docs/db-schema.md` を編集する:
- 各テーブルに役割コメント（テーブル名の直下に1行説明）を必ず付与
- インデックス一覧も合わせて更新

## 3. ER図の更新

`.docs/er-diagram.md` のMermaid記法を更新する:
- リレーション定義（`||--o{` 等）を正確に記述
- エンティティのカラム定義を同期
- Mermaidの制約: 属性の修飾子にハイフン不可（`PK-FK` → `PK` に簡略化）

## 4. SVG生成・色分け・HTML配置

以下のコマンドで変換・配置する:

```bash
# ER図のSVG生成
sed -n '/^```mermaid/,/^```$/p' .docs/er-diagram.md | sed '1d;$d' > /tmp/er-diagram.mmd
npx -y @mermaid-js/mermaid-cli -i /tmp/er-diagram.mmd -o "/mnt/c/Users/mnwka/OneDrive/ドキュメント/2026/20260317_yami/docs/er-diagram.svg" -t default
```

### SVG色分け（NextAuth管理テーブル → オレンジ系背景）

SVG生成後、以下のエンティティのインラインfill/strokeを書き換える:
- 対象: `entity-user-0`, `entity-account-1`, `entity-session-2`, `entity-verification_token-15`
- 背景: `fill="#ECECFF"` → `fill="#FFE0B2"`
- 枠線: `stroke="#9370DB"` → `stroke="#F57C00"`
- 各エンティティの`id="entity-xxx"`から次の`<g class="node`までの範囲内のみ置換する
- テーブル追加・削除時はエンティティIDの番号が変わるため、SVG内のid属性を確認してから置換すること

```python
# 色分け処理の例
auth_entities = ['entity-user-0', 'entity-account-1', 'entity-session-2', 'entity-verification_token-15']
for eid in auth_entities:
    idx = svg.find('id="' + eid + '"')
    next_node = svg.find('<g class="node', idx + 10)
    chunk = svg[idx:next_node]
    new_chunk = chunk.replace('fill="#ECECFF"', 'fill="#FFE0B2"').replace('stroke="#9370DB"', 'stroke="#F57C00"')
    svg = svg[:idx] + new_chunk + svg[next_node:]
```

### HTML生成

```bash
# DB定義書HTML
pandoc .docs/db-schema.md -f markdown -t html -s --metadata title="DB定義書" -c "data:text/css,body{max-width:900px;margin:2em auto;padding:0 1.5em;font-family:sans-serif;line-height:1.6}table{width:100%25;border-collapse:collapse}th,td{border:1px solid %23ccc;padding:8px}th{background:%23f5f5f5}" -o "/mnt/c/Users/mnwka/OneDrive/ドキュメント/2026/20260317_yami/docs/db-schema.html"

# ER図HTML
pandoc .docs/er-diagram.md -f markdown -t html -s --metadata title="ER図" -c "data:text/css,body{max-width:900px;margin:2em auto;padding:0 1.5em;font-family:sans-serif;line-height:1.6}table{width:100%25;border-collapse:collapse}th,td{border:1px solid %23ccc;padding:8px}th{background:%23f5f5f5}" -o "/mnt/c/Users/mnwka/OneDrive/ドキュメント/2026/20260317_yami/docs/er-diagram.html"
```

### er-diagram.html後処理

pandoc生成後、以下を処理する:
1. 重複h1削除: `<header id="title-block-header">...</header>` を除去
2. Mermaidコードブロック置換: `<h2 id="mermaid記法">` 以降の `<pre class="mermaid"><code>...</code></pre>` を `<img src="er-diagram.svg">` に置換
3. 凡例をコンパクトボックスに置換: pandocが生成した凡例テーブル（`<h2 id="凡例...">` から `</table>` + 後続の段落まで）を以下のHTMLで置換:

```html
<div style="display:inline-block; border:1px solid #999; border-radius:6px; padding:12px 20px; margin:12px 0; font-size:0.85em; background:#fafafa;">
<strong>凡例（Crow's Foot記法）</strong>
<table style="width:auto; border:none; margin:6px 0 8px 0; border-collapse:collapse;">
<tr><td style="border:none; padding:2px 12px 2px 0; font-family:monospace;">──|</td><td style="border:none; padding:2px 0;">1（必須）</td></tr>
<tr><td style="border:none; padding:2px 12px 2px 0; font-family:monospace;">──||</td><td style="border:none; padding:2px 0;">1のみ（必須）</td></tr>
<tr><td style="border:none; padding:2px 12px 2px 0; font-family:monospace;">──○</td><td style="border:none; padding:2px 0;">0または1</td></tr>
<tr><td style="border:none; padding:2px 12px 2px 0; font-family:monospace;">──<</td><td style="border:none; padding:2px 0;">多（1以上）</td></tr>
<tr><td style="border:none; padding:2px 12px 2px 0; font-family:monospace;">──○<</td><td style="border:none; padding:2px 0;">多（0以上）</td></tr>
</table>
<div style="font-size:0.9em; margin-top:4px;">
<span style="display:inline-block; width:14px; height:14px; background:#FFE0B2; border:1px solid #F57C00; vertical-align:middle; margin-right:4px; border-radius:2px;"></span> NextAuth管理テーブル
<span style="display:inline-block; width:14px; height:14px; background:#ECECFF; border:1px solid #9370DB; vertical-align:middle; margin-left:12px; margin-right:4px; border-radius:2px;"></span> アプリ独自テーブル
</div>
<div style="font-size:0.8em; color:#666; margin-top:6px;">共通カラム（全テーブル共通、図では省略）: created_at, updated_at, updated_by, deleted_at</div>
</div>
```

## 5. 整合性チェック

更新後、以下を確認する:
- db-schema.md のテーブル一覧と er-diagram.md のエンティティ一覧が一致するか
- リレーション（FK）がER図に反映されているか
- インデックス一覧に漏れがないか

不整合があればユーザーに報告する。

## ルール
- DB定義書とER図は常に同期する。片方だけの更新は禁止
- project-policy.md のドキュメント一覧の状態欄も必要に応じて更新する
