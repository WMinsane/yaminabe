#!/bin/bash
# preToolUse hook: Bashコマンドに危険な文字列が含まれる場合ブロックする
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# ブロック対象の危険キーワード
DANGEROUS_PATTERNS=(
  "prod"
  "production"
  "rm -rf /"
  "mkfs"
  "dd if="
  ":(){:|:&};:"
  "chmod -R 777"
  "DROP DATABASE"
  "DROP TABLE"
  "TRUNCATE"
  "--dangerously-skip-permissions"
  "force-push"
  "push.*--force"
  "--force.*push"
  "install -g"
  "install --global"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -Eqi "$pattern"; then
    echo "BLOCKED: コマンドに危険なパターン '$pattern' が含まれています: $COMMAND" >&2
    exit 2
  fi
done

exit 0
