#!/usr/bin/env bash
# session-guide.sh — SessionStart hook.
# HIỆN cho NGƯỜI DÙNG (systemMessage) gợi ý "nên làm gì tiếp theo" khi mở phiên,
# CHỈ trong dự án dùng khung/template này. Tự nhận biết trạng thái để gợi ý đúng:
#   • Chưa có tiến độ  → hướng bắt đầu (mô tả ý tưởng / /consult / /bootstrap / /auto)
#   • Đang làm dở      → hướng tiếp tục ('tiếp tục' / /auto / /gate)
# Đồng thời XÁC NHẬN model phiên (đọc trường "model" từ stdin): ✅ nếu opusplan,
#   ⚠️ CẢNH BÁO nếu bị picker/UI chọn đè, 🔎 nếu không đọc được → hướng /model opusplan.
# Khi KHÔNG phải opusplan: còn phát additionalContext để AI CHỦ ĐỘNG nhắc chuyển sang
#   opusplan và CHỜ xác nhận trước khi chạy tự động (hook/AI không tự gõ /model được).
# Không đổi gì (chỉ đọc). No-op nếu thiếu jq hoặc không phải dự án của khung.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
command -v jq >/dev/null 2>&1 || exit 0

# Marker: chỉ chạy trong dự án áp dụng khung này.
[ -d "$ROOT/docs/framework" ] || [ -f "$ROOT/.claude/commands/auto.md" ] || exit 0

# Trích "Giai đoạn hiện tại" thật (bỏ dòng rỗng và placeholder "(vd").
phase=""
if [ -f "$ROOT/PROGRESS.md" ]; then
  phase="$(awk '/## Giai đoạn hiện tại/{f=1;next} /^## /{f=0} f' "$ROOT/PROGRESS.md" \
           | sed 's/^[[:space:]]*-[[:space:]]*//' \
           | grep -v '^[[:space:]]*$' | grep -v '(vd' | head -1)"
fi

# Có thay đổi chưa commit? → coi như đang làm dở.
dirty=""
if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  dirty="$(git -C "$ROOT" status --short 2>/dev/null | head -1)"
fi

# XÁC NHẬN model hiện tại (SessionStart stdin có trường "model"; không luôn có).
payload="$(cat 2>/dev/null || true)"
model_id="$(printf '%s' "$payload" | jq -r '.model // empty' 2>/dev/null || true)"
case "$model_id" in
  *opusplan*) mnote="✅ Model: đang ở opusplan (Opus lập kế hoạch → Sonnet viết code) — đúng." ;;
  "")         mnote="🔎 Model: chưa đọc được từ phiên → XÁC NHẬN bằng /model (cần thấy opusplan). Nếu chưa phải: /model opusplan (tránh Opus thuần, Pro ~1h hết quota)." ;;
  *)          mnote="⚠️ CẢNH BÁO — model phiên = ${model_id}, KHÔNG phải opusplan: có thể GIAO DIỆN/PICKER đã CHỌN ĐÈ lên mặc định repo. Hệ quả: chạy 1 model cho mọi việc (nếu Opus thuần → Pro ~1h hết quota; nếu Sonnet/Haiku thuần → mất pha Opus lập kế hoạch). SỬA: gõ /model opusplan → xác nhận lại bằng /model." ;;
esac

if [ -z "$phase" ] && [ -z "$dirty" ]; then
  msg="🧭 Dự án dùng KHUNG (template). Chưa có tiến độ ghi nhận.
${mnote}
Bắt đầu thế nào:
• Mô tả ý tưởng/yêu cầu dự án — hoặc gõ /consult (chọn công nghệ, research-first)
• /bootstrap (dựng nền dự án mới)  •  /auto (Opus lập kế hoạch → chạy tự động)
• Model & chế độ tự động: docs/framework/models-and-automation.md"
else
  extra=""
  [ -n "$phase" ] && extra=" — GĐ hiện tại: ${phase}"
  [ -n "$dirty" ] && extra="${extra} (có thay đổi chưa commit)"
  msg="🧭 Dự án dùng KHUNG${extra}.
${mnote}
Tiếp theo nên:
• Gõ 'tiếp tục' để nối việc dở (PROGRESS.md đã được nạp) — xem mục 'Đang làm'/'Tiếp theo'/'Bàn giao phiên'
• /auto để tự động điều phối  •  /gate trước khi commit  •  /incident nếu có sự cố
• /completion để hoàn thiện dự án (audit 12 nhóm → kế hoạch → sửa từng đợt → quét lại đến khi sạch)"
fi

# Khi KHÔNG phải opusplan → yêu cầu AI chủ động dẫn việc chuyển & xác nhận.
# (Hook/AI không tự gõ /model được; AI nhắc người dùng chuyển rồi CHỜ xác nhận.)
case "$model_id" in
  *opusplan*) actx="" ;;
  *) actx="Model phiên hiện tại: '${model_id:-không đọc được}' — KHÔNG phải opusplan (mặc định repo). TRƯỚC KHI chạy tự động: chủ động nhắc người dùng gõ /model opusplan, rồi CHỜ họ xác nhận đã chuyển sang opusplan mới tiếp tục. Nếu người dùng cố ý giữ model khác, tôn trọng nhưng nêu rõ đánh đổi (Opus thuần tốn quota Pro; Sonnet/Haiku thuần mất pha Opus lập kế hoạch)." ;;
esac

if [ -n "$actx" ]; then
  jq -n --arg m "$msg" --arg c "$actx" \
    '{systemMessage:$m, hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
else
  jq -n --arg m "$msg" '{systemMessage:$m}'
fi
exit 0
