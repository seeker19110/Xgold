#!/usr/bin/env bash
# pre-commit-gate.sh — PreToolUse hook (matcher: Bash).
# Khi Claude định chạy `git commit`, chạy cổng chất lượng (build/typecheck/lint/test)
# qua scripts/dev-task.sh. Cổng ĐỎ → exit 2 để CHẶN commit (đồng bộ CLAUDE.md §5).
# Cổng no-op (dự án chưa cấu hình lệnh) → exit 0, cho commit chạy bình thường.
#
# An toàn đa-loại-dự-án: hook KHÔNG chứa lệnh stack nào; mọi lệnh nằm sau dev-task.sh.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Đọc payload hook từ stdin, lấy lệnh Bash sắp chạy.
payload="$(cat)"
cmd=""
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
else
  # Fallback thô: tìm chuỗi "command" trong JSON.
  cmd="$payload"
fi

# Chỉ can thiệp khi thực sự là `git commit` (bỏ qua commit-tree, --help…).
if ! printf '%s' "$cmd" | grep -Eq '(^|[^-])git[[:space:]]+([^|&;]*[[:space:]])?commit([[:space:]]|$)'; then
  exit 0
fi

# Người dùng chủ động bỏ qua cổng?
if printf '%s' "$cmd" | grep -Eq '(--no-verify|-n[[:space:]]|--no-gate)'; then
  echo "[pre-commit-gate] phát hiện --no-verify → bỏ qua cổng." >&2
  exit 0
fi

if [ ! -x "$ROOT/scripts/dev-task.sh" ]; then
  # Không có dispatcher → không chặn (an toàn), chỉ nhắc.
  echo "[pre-commit-gate] không thấy scripts/dev-task.sh → bỏ qua cổng." >&2
  exit 0
fi

if "$ROOT/scripts/dev-task.sh" gate; then
  exit 0
else
  echo "❌ Cổng trước commit ĐỎ (build/typecheck/lint/test). Sửa hết rồi commit lại (CLAUDE.md §5)." >&2
  echo "   Bỏ qua có chủ đích: thêm --no-verify vào lệnh git commit." >&2
  exit 2
fi
