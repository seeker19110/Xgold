#!/usr/bin/env bash
# Smoke test cho copy-framework.sh / copy-framework.ps1: chạy thật vào thư mục scratch,
# xác nhận (1) cấu trúc copy đúng như tài liệu mô tả (Lớp 1 copy thẳng, Lớp 2 vào
# _framework-dropins/), (2) KHÔNG đè file đã có ở dự án đích, (3) chạy lại lần hai
# không lỗi. copy-framework.ps1 chỉ được kiểm nếu máy có `pwsh` (luôn có trên
# runner ubuntu-latest của GitHub Actions).
# Chạy: bash scripts/test-copy-framework.sh
set -uo pipefail

cd "$(git rev-parse --show-toplevel)"
REPO_ROOT="$(pwd)"
fail=0
tmp_dirs=()
cleanup() { [ "${#tmp_dirs[@]}" -eq 0 ] || rm -rf "${tmp_dirs[@]}"; }
trap cleanup EXIT

new_target() {
  local t
  t="$(mktemp -d)"
  git init -q "$t"
  tmp_dirs+=("$t")
  printf '%s' "$t"
}

run_logged() {          # run_logged <mô tả> <lệnh...>
  local desc="$1"; shift
  if "$@" >/tmp/copy-framework-test.log 2>&1; then
    return 0
  fi
  echo "  FAIL [$desc]: script thoát lỗi — log:"
  sed 's/^/    /' /tmp/copy-framework-test.log
  fail=1
  return 1
}

check_structure() {     # check_structure <mô tả> <target>
  local label="$1" target="$2" ok=1
  [ -f "$target/docs/framework/new-project-runbook.md" ] || { echo "  FAIL [$label]: thiếu docs/framework/new-project-runbook.md"; ok=0; }
  [ -d "$target/.claude/commands" ] && [ -f "$target/.claude/commands/gate.md" ] || { echo "  FAIL [$label]: thiếu .claude/commands/gate.md"; ok=0; }
  [ -f "$target/.claude/settings.json" ] || { echo "  FAIL [$label]: thiếu .claude/settings.json"; ok=0; }
  [ -d "$target/.claude/agents" ] || { echo "  FAIL [$label]: thiếu .claude/agents/"; ok=0; }
  [ -f "$target/CLAUDE.md" ] || { echo "  FAIL [$label]: thiếu CLAUDE.md"; ok=0; }
  [ -f "$target/_framework-dropins/eslint.config.mjs" ] || { echo "  FAIL [$label]: thiếu _framework-dropins/eslint.config.mjs"; ok=0; }
  [ ! -e "$target/eslint.config.mjs" ] || { echo "  FAIL [$label]: eslint.config.mjs bị copy thẳng ra gốc (chỉ được nằm trong _framework-dropins/)"; ok=0; }
  [ "$ok" -eq 1 ] && echo "  ok [$label]: cấu trúc copy đúng kỳ vọng" || fail=1
}

check_no_overwrite() {  # check_no_overwrite <mô tả> <target>
  local label="$1" target="$2"
  if grep -q "SENTINEL-KHONG-DUOC-DE" "$target/CLAUDE.md" 2>/dev/null; then
    echo "  ok [$label]: CLAUDE.md sẵn có KHÔNG bị đè"
  else
    echo "  FAIL [$label]: CLAUDE.md sẵn có đã bị đè!"
    fail=1
  fi
  if [ -f "$target/CLAUDE.md.framework-new" ]; then
    echo "  ok [$label]: bản khung để cạnh ở CLAUDE.md.framework-new"
  else
    echo "  FAIL [$label]: thiếu CLAUDE.md.framework-new khi đích đã có CLAUDE.md"
    fail=1
  fi
}

check_claude_config_not_overwritten() {   # check_claude_config_not_overwritten <mô tả> <target>
  local label="$1" target="$2"
  if grep -q "SENTINEL-KHONG-DUOC-DE" "$target/.claude/settings.json" 2>/dev/null; then
    echo "  ok [$label]: .claude/settings.json sẵn có KHÔNG bị đè"
  else
    echo "  FAIL [$label]: .claude/settings.json sẵn có đã bị đè!"
    fail=1
  fi
  [ -f "$target/.claude/settings.json.framework-new" ] \
    && echo "  ok [$label]: bản khung để cạnh ở settings.json.framework-new" \
    || { echo "  FAIL [$label]: thiếu settings.json.framework-new"; fail=1; }
  if grep -q "SENTINEL-KHONG-DUOC-DE" "$target/.claude/hooks/my-hook.sh" 2>/dev/null; then
    echo "  ok [$label]: .claude/hooks sẵn có KHÔNG bị đè"
  else
    echo "  FAIL [$label]: .claude/hooks sẵn có đã bị đè!"
    fail=1
  fi
  [ -d "$target/.claude/hooks.framework-new" ] \
    && echo "  ok [$label]: bản khung để cạnh ở hooks.framework-new" \
    || { echo "  FAIL [$label]: thiếu hooks.framework-new"; fail=1; }
}

echo "== bash / đích trống =="
targetA="$(new_target)"
run_logged "bash / đích trống" bash "$REPO_ROOT/copy-framework.sh" "$targetA"
check_structure "bash / đích trống" "$targetA"

echo ""
echo "== bash / đích đã có CLAUDE.md + .claude/settings.json + .claude/hooks (không được đè) =="
targetB="$(new_target)"
echo "SENTINEL-KHONG-DUOC-DE" > "$targetB/CLAUDE.md"
mkdir -p "$targetB/.claude/hooks"
echo '{"SENTINEL-KHONG-DUOC-DE": true}' > "$targetB/.claude/settings.json"
echo "SENTINEL-KHONG-DUOC-DE" > "$targetB/.claude/hooks/my-hook.sh"
run_logged "bash / đích có sẵn" bash "$REPO_ROOT/copy-framework.sh" "$targetB"
check_no_overwrite "bash / đích có sẵn" "$targetB"
check_claude_config_not_overwritten "bash / đích có sẵn" "$targetB"

echo ""
echo "== bash / chạy lại lần hai trên cùng đích =="
run_logged "bash / chạy lại lần 2" bash "$REPO_ROOT/copy-framework.sh" "$targetA" \
  && echo "  ok [bash / chạy lại lần 2]: không lỗi"

if command -v pwsh >/dev/null 2>&1; then
  echo ""
  echo "== pwsh / đích trống =="
  targetD="$(new_target)"
  run_logged "pwsh / đích trống" pwsh -NoProfile -File "$REPO_ROOT/copy-framework.ps1" "$targetD"
  check_structure "pwsh / đích trống" "$targetD"

  echo ""
  echo "== pwsh / đích đã có CLAUDE.md + .claude/settings.json + .claude/hooks (không được đè) =="
  targetE="$(new_target)"
  echo "SENTINEL-KHONG-DUOC-DE" > "$targetE/CLAUDE.md"
  mkdir -p "$targetE/.claude/hooks"
  echo '{"SENTINEL-KHONG-DUOC-DE": true}' > "$targetE/.claude/settings.json"
  echo "SENTINEL-KHONG-DUOC-DE" > "$targetE/.claude/hooks/my-hook.sh"
  run_logged "pwsh / đích có sẵn" pwsh -NoProfile -File "$REPO_ROOT/copy-framework.ps1" "$targetE"
  check_no_overwrite "pwsh / đích có sẵn" "$targetE"
  check_claude_config_not_overwritten "pwsh / đích có sẵn" "$targetE"
else
  echo ""
  echo "  (bỏ qua kiểm thử .ps1 — máy này không có pwsh; CI ubuntu-latest có sẵn)"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "OK — copy-framework.sh/.ps1 hoạt động đúng kỳ vọng."
fi
exit "$fail"
