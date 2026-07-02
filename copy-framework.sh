#!/usr/bin/env bash
#
# copy-framework.sh — Mang bộ khung sang một DỰ ÁN KHÁC (kể cả dự án đã có sẵn).
#
# Cách dùng:
#   1) Clone repo khung này về máy (hoặc bạn đang đứng sẵn trong nó).
#   2) Chạy:   bash copy-framework.sh /đường-dẫn/tới/dự-án-đích
#   3) Mở phiên Claude Code TRONG dự án đích → AI tự đọc CLAUDE.md và tự dò stack.
#
# An toàn cho dự án đã có sẵn (brownfield):
#   - Tài liệu khung (docs/framework, mẫu ADR)  → copy thẳng (chỉ là tài liệu tham khảo mới).
#   - File gốc (CLAUDE.md, PROJECT.md...)        → chỉ copy nếu CHƯA có; nếu đã có thì để bản
#                                                  khung cạnh bên dưới đuôi .framework-new để bạn tự so.
#   - File cấu hình/stack (eslint, husky, app...) → KHÔNG đè; đưa vào _framework-dropins/ để bạn tự merge.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR"

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "Lỗi: thiếu đường dẫn dự án đích."
  echo "Dùng:  bash copy-framework.sh /đường-dẫn/tới/dự-án-đích"
  exit 1
fi
if [ ! -d "$TARGET" ]; then
  echo "Lỗi: '$TARGET' không phải thư mục."
  exit 1
fi
if [ ! -d "$TARGET/.git" ]; then
  echo "Cảnh báo: '$TARGET' không có .git — chắc đây là gốc repo dự án chứ?"
fi

# ── Trợ giúp ──────────────────────────────────────────────
copy_into() {           # copy thẳng (tạo thư mục cha)
  local rel="$1"
  [ -e "$SRC/$rel" ] || return 0
  mkdir -p "$TARGET/$(dirname "$rel")"
  cp -R "$SRC/$rel" "$TARGET/$rel"
  echo "  + $rel"
}
copy_if_absent() {      # chỉ copy nếu đích chưa có; nếu có thì để bản .framework-new
  local rel="$1"
  [ -e "$SRC/$rel" ] || return 0
  mkdir -p "$TARGET/$(dirname "$rel")"
  if [ -e "$TARGET/$rel" ]; then
    cp -R "$SRC/$rel" "$TARGET/$rel.framework-new"
    echo "  ~ $rel đã tồn tại → bản khung để ở $rel.framework-new (tự so/merge)"
  else
    cp -R "$SRC/$rel" "$TARGET/$rel"
    echo "  + $rel"
  fi
}
stage() {               # đưa vào _framework-dropins/ (không đụng file đang chạy)
  local rel="$1"
  [ -e "$SRC/$rel" ] || return 0
  mkdir -p "$TARGET/_framework-dropins/$(dirname "$rel")"
  cp -R "$SRC/$rel" "$TARGET/_framework-dropins/$rel"
  echo "  → _framework-dropins/$rel"
}

echo ""
echo "Nguồn:  $SRC"
echo "Đích:   $TARGET"
echo ""

# ── LỚP 1 — Quy trình & tiêu chuẩn (áp mọi stack): copy thẳng ──
echo "[1/3] Tài liệu khung (Lớp 1 — dùng được ngay, mọi stack):"
copy_into "docs/framework"
copy_into "docs/ops"
copy_into ".claude/commands"                   # slash commands của khung: /consult /bootstrap /auto /gate /adr /ui-ux /audit-optimize /audit-full /completion /incident
copy_if_absent "docs/adr/0000-template.md"

# ── File gốc dự án: chỉ copy nếu chưa có ──
copy_if_absent "CLAUDE.md"
copy_if_absent "PROJECT.md"
copy_if_absent "PROGRESS.md"
copy_if_absent "CHANGELOG.md"
copy_if_absent "CONTRIBUTING.md"
copy_if_absent "SECURITY.md"
copy_if_absent ".editorconfig"
copy_if_absent ".nvmrc"
copy_if_absent ".env.example"
# LICENSE KHÔNG copy: mỗi dự án tự chọn giấy phép + chủ sở hữu riêng.

# ── Cấu hình Claude Code: copy thẳng ──
echo ""
echo "[2/3] Cấu hình Claude Code (opusplan — tối ưu token: Opus lập kế hoạch, Sonnet code, Haiku phụ):"
mkdir -p "$TARGET/.claude"
cp -R "$SRC/.claude/settings-shared-opusplan.json" "$TARGET/.claude/settings.json"
cp -R "$SRC/.claude/hooks" "$TARGET/.claude/hooks" 2>/dev/null || true
cp -R "$SRC/.claude/agents" "$TARGET/.claude/agents" 2>/dev/null || true
echo "  → .claude/settings.json (opusplan; fallback Sonnet 5 → Haiku 4.5)"
echo "  → .claude/hooks"
echo "  → .claude/agents (subagent: lookup, version-check [Haiku]; executor [Sonnet])"

echo ""
echo "[3/3] File cấu hình khác (Lớp 2 — KHÔNG đè; để bạn tự merge cái khớp stack):"
for f in \
  eslint.config.mjs postcss.config.mjs \
  .prettierrc .prettierignore .lintstagedrc.json commitlint.config.cjs \
  vitest.config.ts vitest.setup.ts playwright.config.ts lighthouserc.json \
  .husky/pre-commit .husky/commit-msg \
  .github/workflows/ci.yml .github/workflows/lighthouse-ci.yml \
  .github/workflows/codeql.yml .github/workflows/secret-scan.yml .github/workflows/release.yml \
  .github/pull_request_template.md .github/dependabot.yml .github/ISSUE_TEMPLATE .github/CODEOWNERS \
  lib/env.ts styles/theme.css components/theme-toggle.tsx i18n/request.ts messages app \
  supabase \
; do
  stage "$f"
done

echo ""
echo "[4/4] Xong. Tiếp theo trong dự án đích:"
cat <<'NEXT'

  1) Cấu hình Claude Code đã sẵn sàng: .claude/settings.json dùng opusplan (tối ưu token).
     → Opus lập kế hoạch, Sonnet code, Haiku (subagent) việc phụ — chỉ trả giá Opus khi thực sự cần.
     ✅ Dự án nhỏ muốn rẻ hơn nữa: đổi "model" thành "claude-sonnet-5".
     ✅ Dự án rất phức tạp: nâng riêng lúc cần bằng /model claude-opus-4-8 (hoặc claude-fable-5).

  2) Mở phiên Claude Code NGAY TRONG dự án đích.
     → AI tự đọc CLAUDE.md + .claude/settings.json (opusplan sẵn sàng).
     → Chạy Bước 0 của docs/framework/existing-project-adoption.md
       (tự dò stack bằng cách đọc package.json/config — không cần bạn khai stack).

  3) Soát thư mục _framework-dropins/ : merge file cấu hình KHỚP stack vào dự án
     (các file lớp 2 khác: eslint, prettier, playwright, github workflows, etc.).
     Xong thì có thể xóa _framework-dropins/.

  4) Commit, rồi áp khung tăng dần theo existing-project-adoption.md
     (Prettier → ESLint → TS strict → hook → CI → lấp lỗ hổng test/a11y/hiệu năng).

  5) Muốn hoàn thiện toàn dự án (hết lỗi đã biết, tính năng thống nhất, có bằng chứng):
     gõ /completion — audit 12 nhóm → kế hoạch chi tiết (duyệt) → sửa từng đợt → quét lại đến khi sạch.

  (Tùy chọn) Muốn luật áp cho MỌI dự án trên máy: chép CLAUDE.md vào ~/.claude/CLAUDE.md.
NEXT
echo ""
