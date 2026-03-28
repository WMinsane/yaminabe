---
name: session-report
description: フェーズ終了時にセッションJSONLを解析し、計測5軸のレポートを出力する。
disable-model-invocation: true
user-invocable: true
argument-hint: "[フェーズ名]"
allowed-tools: Read, Bash, Grep, Glob, Write, Edit
---

# セッションレポート

フェーズ: $ARGUMENTS

## 手順

### Step 1: JSONLファイルの特定

```bash
find ~/.claude/projects/-home-user-claude-test-yaminabe/ -maxdepth 1 -name "*.jsonl" -type f
```

複数ファイルがある場合は全ファイルを対象とする。

### Step 2: 5軸メトリクスの自動集計

以下のPythonスクリプトをBashツールで実行する。JSONLパスは Step 1 の結果に置き換える。

```python
import json, sys, os

# --- 設定 ---
jsonl_dir = os.path.expanduser("~/.claude/projects/-home-user-claude-test-yaminabe/")
jsonl_files = sorted([
    os.path.join(jsonl_dir, f) for f in os.listdir(jsonl_dir)
    if f.endswith(".jsonl")
])

# --- 集計変数 ---
user_human_count = 0       # 軸1: ラリー数
user_human_chars = 0       # 軸2: 指示分量
total_new_lines = 0        # 軸3: 手戻り率（分母）
total_changed_lines = 0    # 軸3: 手戻り率（変更行）
total_deleted_lines = 0    # 軸3: 手戻り率（削除行）
reject_count = 0           # 軸4: 手戻り原因（reject数）
total_input_tokens = 0     # 軸5: トークン効率
total_output_tokens = 0    # 軸5: トークン効率
edit_files = {}            # ファイル別Edit回数
edit_count = 0
write_count = 0

for jsonl_path in jsonl_files:
    with open(jsonl_path, 'r') as f:
        for line in f:
            data = json.loads(line)
            t = data.get('type', '')

            if t == 'user':
                msg = data.get('message', {})
                content = msg.get('content', '')
                # テキスト型のユーザーメッセージ（tool_resultを除外）
                if isinstance(content, str) and content.strip():
                    user_human_count += 1
                    user_human_chars += len(content)
                elif isinstance(content, list):
                    has_text = any(
                        isinstance(c, dict) and c.get('type') == 'text'
                        for c in content
                    )
                    has_tool_result = any(
                        isinstance(c, dict) and c.get('type') == 'tool_result'
                        for c in content
                    )
                    if has_text and not has_tool_result:
                        user_human_count += 1
                        for c in content:
                            if isinstance(c, dict) and c.get('type') == 'text':
                                user_human_chars += len(c.get('text', ''))
                    # Reject検出（tool_result内）
                    if has_tool_result:
                        for c in content:
                            if isinstance(c, dict) and c.get('type') == 'tool_result':
                                txt = str(c.get('content', ''))
                                if "user doesn't want to proceed" in txt.lower() or 'was rejected' in txt.lower():
                                    reject_count += 1

            elif t == 'assistant':
                msg = data.get('message', {})
                usage = msg.get('usage', {})
                total_input_tokens += usage.get('input_tokens', 0)
                total_output_tokens += usage.get('output_tokens', 0)

                content = msg.get('content', [])
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get('type') == 'tool_use':
                            name = c.get('name', '')
                            inp = c.get('input', {})

                            if name == 'Write':
                                write_count += 1
                                text = inp.get('content', '')
                                lines = text.count('\n') + 1 if text else 0
                                total_new_lines += lines

                            elif name == 'Edit':
                                edit_count += 1
                                fp = inp.get('file_path', '')
                                edit_files[fp] = edit_files.get(fp, 0) + 1
                                old_str = inp.get('old_string', '')
                                new_str = inp.get('new_string', '')
                                old_lines = old_str.count('\n') + 1 if old_str else 0
                                new_lines = new_str.count('\n') + 1 if new_str else 0
                                if new_lines > old_lines:
                                    total_new_lines += (new_lines - old_lines)
                                elif old_lines > new_lines:
                                    total_deleted_lines += (old_lines - new_lines)
                                total_changed_lines += min(old_lines, new_lines)

# --- 算出 ---
total_tokens = total_input_tokens + total_output_tokens
rework_rate = (total_changed_lines + total_deleted_lines) / total_new_lines * 100 if total_new_lines > 0 else 0
token_eff = total_new_lines / total_tokens * 1000 if total_tokens > 0 else 0

# --- 出力 ---
print("=== 5軸メトリクス ===")
print(f"軸1 ラリー数: {user_human_count}回")
print(f"軸2 指示分量: {user_human_chars:,}文字")
print(f"軸3 手戻り率: {rework_rate:.1f}% (変更{total_changed_lines}行 + 削除{total_deleted_lines}行 / 新規{total_new_lines}行)")
print(f"軸4 Reject数: {reject_count}件")
print(f"軸5 トークン効率: {token_eff:.2f} 行/1000トークン (生成{total_new_lines}行 / {total_tokens:,}トークン)")
print(f"    内訳: input={total_input_tokens:,} output={total_output_tokens:,}")
print(f"\n--- 補助データ ---")
print(f"Edit呼出: {edit_count}回, Write呼出: {write_count}回")
print(f"\n--- ファイル別Edit回数（上位10） ---")
for fp, count in sorted(edit_files.items(), key=lambda x: -x[1])[:10]:
    print(f"  {count:3d}x  {os.path.basename(fp)}")
```

### Step 3: 手戻り原因分類

Step 2のreject数は自動検出。ただしreject以外の手戻り（ユーザー指摘による修正）はJSONLからの自動分類が困難なため、以下の方法で補完する:

1. `.user-eval/` 内の過去evalレポートの「手戻り・認識齟齬」テーブルを集計
2. `.review/` 内の指摘表から指摘数を集計
3. 今回セッションの手戻りをセッション履歴から手動分類

分類基準（`.docs/project-policy.md` §6.5）:
- **ユーザー起因**: 指示変更・追加要件・方針転換
- **Claude起因**: ドキュメント見落とし・判断ミス・指示の誤解
- **不明**: 分類が困難な場合

### Step 4: レポート作成

Step 2-3の結果をもとに、以下のフォーマットでレポートを作成する。

```markdown
# セッションレポート — {フェーズ名}

**期間**: {YYYY-MM-DD} 〜 {YYYY-MM-DD}
**フェーズ**: {フェーズ名}

## 5軸メトリクス

| # | 観点 | 値 | 備考 |
|---|------|-----|------|
| 1 | ラリー数 | {N}回 | ユーザー→AIのやり取り回数 |
| 2 | 指示分量 | {N}文字 | ユーザーメッセージの合計文字数 |
| 3 | 手戻り率 | {N}% | (変更{N}行 + 削除{N}行) / 新規{N}行 |
| 4 | 手戻り原因 | ユーザー{N}件 / Claude{N}件 / 不明{N}件 | reject{N}件含む |
| 5 | トークン効率 | {N}行/{N}トークン | 生成行数 / 消費トークン |

## 手戻り詳細

### ファイル別Edit回数（上位）
| ファイル | Edit回数 |
|---------|---------|

### 手戻り原因内訳
| # | 場面 | 原因区分 | セッション |
|---|------|---------|-----------|

## 所見
{特筆すべき傾向、前フェーズ比較、改善提案}
```

### Step 5: 保存

`.user-eval/{連番3桁}_{フェーズ名}_session_report.md` に保存する。
連番は `.user-eval/` 内の既存ファイルの最大連番 + 1。
