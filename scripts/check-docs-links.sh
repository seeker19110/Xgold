#!/usr/bin/env bash
# check-docs-links.sh — kiểm tra THAM CHIẾU CHÉO trong tài liệu markdown của khung:
# mọi đường dẫn dạng `docs/...`, `.claude/...`, `scripts/...`… được nhắc trong *.md
# phải TỒN TẠI THẬT trong repo. Chặn "tham chiếu chết" sau các đợt đổi tên/di chuyển file
# (đúng nguyên tắc KHUNG-1 số 6: tiêu chuẩn kiểm được bằng máy thì tự động hóa).
#
# Bỏ qua khi quét:
#   - PROGRESS.md, CHANGELOG.md          → nhật ký/lịch sử, được phép nhắc tên cũ.
#   - docs/framework/README.md           → chứa bảng ánh xạ tên CŨ → MỚI (tên cũ cố ý).
#   - token chứa *, <, …, ..             → mẫu/placeholder, không phải đường dẫn thật.
# ALLOWLIST: đường dẫn chỉ tồn tại ở DỰ ÁN ĐÍCH (file sinh ra khi áp khung/scaffold).
#
# Dùng: scripts/check-docs-links.sh   (exit 0 = sạch, exit 1 = có tham chiếu chết)
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

# Đường dẫn hợp lệ dù không có trong repo khung (chỉ sinh ra tại dự án đích).
ALLOWLIST="
docs/FEATURE-MAP.md
docs/CONVENTIONS.md
docs/ops/COMPLETION-PLAN.md
docs/ops/COMPREHENSIVE-AUDIT-STATUS.md
.claude/project-commands.sh
.claude/usage-budget.sh
app/globals.css
app/layout.tsx
lib/example.test.ts
"

fail=0
while IFS= read -r f; do
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in
      *'*'* | *'<'* | *'…'* | *'..'*) continue ;;
    esac
    if [ -e "$p" ]; then continue; fi
    if printf '%s\n' "$ALLOWLIST" | grep -qx "$p"; then continue; fi
    echo "❌ $f → tham chiếu không tồn tại: $p"
    fail=1
  done < <(
    grep -oE '`[^`]+`' "$f" 2>/dev/null \
      | tr -d '\`' \
      | grep -E '^(docs|scripts|styles|lib|e2e|i18n|messages|app|components|supabase|\.claude|\.github|\.husky)/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+$' \
      | sort -u
  )
done < <(
  find . -name '*.md' \
    -not -path './node_modules/*' \
    -not -path './_framework-dropins/*' \
    -not -name 'PROGRESS.md' \
    -not -name 'CHANGELOG.md' \
    -not -path './docs/framework/README.md' \
    | sed 's|^\./||' | sort
)

if [ "$fail" -eq 0 ]; then
  echo "✅ Tham chiếu chéo tài liệu: OK (mọi đường dẫn được nhắc đều tồn tại)"
fi
exit "$fail"
