#!/usr/bin/env bash
# dev-task.sh — điểm vào ỔN ĐỊNH, KHÔNG phụ thuộc stack, cho các tác vụ dev.
#
# Vì sao tồn tại: template hỗ trợ MỌI loại dự án (web/mobile/backend/CLI/data/…),
# nên KHÔNG được hardcode lệnh (npm/ruff/go…) vào hook hay settings. Thay vào đó
# hook chỉ gọi `dev-task.sh <task>`; script này tự phân giải lệnh đúng cho dự án.
#
# Thứ tự phân giải (đầu tiên thắng):
#   1) KHAI BÁO: nếu có .claude/project-commands.sh và định nghĩa biến <task> → chạy.
#   2) TỰ DÒ: nhận diện hệ sinh thái (node/python/go/rust/make) → chạy lệnh quy ước.
#   3) NO-OP: không có gì khớp → in thông báo skip, exit 0 (KHÔNG làm gãy dự án nào).
#
# Task hỗ trợ: format | lint | typecheck | test | build | gate
#   gate = chạy tuần tự build→typecheck→lint→test (cái nào phân giải được), đỏ 1 cái → fail.
#
# Dùng: scripts/dev-task.sh <task>
set -uo pipefail

TASK="${1:-}"
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DECL="$ROOT/.claude/project-commands.sh"

log() { printf '[dev-task] %s\n' "$*" >&2; }

if [ -z "$TASK" ]; then
  log "thiếu tên task. Dùng: dev-task.sh format|lint|typecheck|test|build|gate"
  exit 2
fi

# --- 1) Lệnh KHAI BÁO (escape hatch cho mọi dự án đặc thù) --------------------
declared_cmd() {
  # In ra lệnh khai báo cho $1 nếu có, ngược lại rỗng.
  [ -f "$DECL" ] || return 0
  # Nạp trong subshell để không rò biến; lấy giá trị biến trùng tên task.
  ( set +u; . "$DECL" >/dev/null 2>&1; eval "printf '%s' \"\${$1:-}\"" )
}

# --- 2) TỰ DÒ theo hệ sinh thái ---------------------------------------------
node_pm() {
  if   [ -f "$ROOT/pnpm-lock.yaml" ]; then echo "pnpm"
  elif [ -f "$ROOT/yarn.lock" ];      then echo "yarn"
  elif [ -f "$ROOT/bun.lockb" ];      then echo "bun"
  else echo "npm"; fi
}
node_has_script() {
  # $1 = tên script; true nếu package.json khai báo nó.
  [ -f "$ROOT/package.json" ] || return 1
  if command -v jq >/dev/null 2>&1; then
    jq -e --arg s "$1" '.scripts[$s] // empty' "$ROOT/package.json" >/dev/null 2>&1
  else
    grep -Eq "\"$1\"[[:space:]]*:" "$ROOT/package.json"
  fi
}

detected_cmd() {
  # In ra lệnh tự-dò cho task $1, hoặc rỗng nếu không dò được.
  local t="$1" pm
  # Node/JS: ưu tiên script cùng tên trong package.json
  if [ -f "$ROOT/package.json" ] && node_has_script "$t"; then
    pm="$(node_pm)"; echo "$pm run $t"; return 0
  fi
  # Python (pyproject.toml)
  if [ -f "$ROOT/pyproject.toml" ]; then
    case "$t" in
      format)    command -v ruff >/dev/null 2>&1 && { echo "ruff format ."; return 0; }
                 command -v black >/dev/null 2>&1 && { echo "black ."; return 0; } ;;
      lint)      command -v ruff >/dev/null 2>&1 && { echo "ruff check ."; return 0; } ;;
      typecheck) command -v mypy >/dev/null 2>&1 && { echo "mypy ."; return 0; } ;;
      test)      command -v pytest >/dev/null 2>&1 && { echo "pytest -q"; return 0; } ;;
    esac
  fi
  # Go
  if [ -f "$ROOT/go.mod" ]; then
    case "$t" in
      format)    echo "gofmt -l -w ."; return 0 ;;
      lint)      echo "go vet ./..."; return 0 ;;
      test)      echo "go test ./..."; return 0 ;;
      build)     echo "go build ./..."; return 0 ;;
    esac
  fi
  # Rust
  if [ -f "$ROOT/Cargo.toml" ]; then
    case "$t" in
      format)    echo "cargo fmt"; return 0 ;;
      lint)      echo "cargo clippy -- -D warnings"; return 0 ;;
      test)      echo "cargo test"; return 0 ;;
      build)     echo "cargo build"; return 0 ;;
    esac
  fi
  # Makefile target trùng tên
  if [ -f "$ROOT/Makefile" ] && grep -Eq "^$t:" "$ROOT/Makefile"; then
    echo "make $t"; return 0
  fi
  return 0
}

resolve() { # $1=task -> in lệnh (khai báo ưu tiên), rỗng nếu không có
  local c; c="$(declared_cmd "$1")"; [ -n "$c" ] && { echo "$c"; return 0; }
  detected_cmd "$1"
}

run_task() { # $1=task -> chạy; 0 nếu ok hoặc no-op, khác 0 nếu lệnh fail
  local cmd; cmd="$(resolve "$1")"
  if [ -z "$cmd" ]; then log "skip: chưa cấu hình/dò được '$1'"; return 0; fi
  log "run [$1]: $cmd"
  ( cd "$ROOT" && bash -c "$cmd" )
}

# --- Điều phối ---------------------------------------------------------------
case "$TASK" in
  format|lint|typecheck|test|build)
    run_task "$TASK"; exit $? ;;
  gate)
    rc=0
    for t in build typecheck lint test; do
      run_task "$t" || { rc=1; log "GATE ĐỎ ở '$t' → dừng"; break; }
    done
    [ "$rc" -eq 0 ] && log "GATE XANH (hoặc no-op)"
    exit "$rc" ;;
  *)
    log "task không hợp lệ: '$TASK' (format|lint|typecheck|test|build|gate)"; exit 2 ;;
esac
