# .claude/project-commands.sh — KHAI BÁO lệnh dev cho DỰ ÁN NÀY (escape hatch)
#
# Cách dùng: copy file này thành `.claude/project-commands.sh` rồi điền lệnh THẬT
# của dự án. `scripts/dev-task.sh` sẽ ưu tiên các biến ở đây trước khi tự dò.
# Chỉ cần điền những task dự án có; để trống/không khai báo thì script tự dò hoặc no-op.
#
# Đây là NƠI DUY NHẤT chứa lệnh đặc thù stack — nhờ vậy hook/settings trong template
# giữ nguyên, không phụ thuộc loại dự án. (Mỗi dự án khác nhau → chỉ khác file này.)
#
# Ví dụ cho một dự án Node:
#   format="npm run format"
#   lint="npm run lint"
#   typecheck="npm run type-check"
#   test="npm test"
#   build="npm run build"
#
# Ví dụ Python:
#   format="ruff format ."
#   lint="ruff check ."
#   typecheck="mypy ."
#   test="pytest -q"
#
# Ví dụ hỗn hợp/monorepo (tùy ý ghép lệnh):
#   test="pnpm -r test && pytest -q"

# --- Điền cho dự án của bạn bên dưới (bỏ dấu # để bật) ---
# format=""
# lint=""
# typecheck=""
# test=""
# build=""
