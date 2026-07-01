# .claude/usage-budget.sh — BUDGET token/5h theo GÓI của bạn (tự hiệu chỉnh)
#
# Copy file này thành `.claude/usage-budget.sh` rồi điền số. Có file này thì
# tính năng ước tính % quota 5h + nhắc wind-down (Stop hook) mới bật.
# KHÔNG có file → OVERALL=NA → tính năng tự tắt (không báo động sai).
#
# VÌ SAO PHẢI TỰ ĐIỀN: Anthropic không công bố hạn mức token/5h của từng model
# dạng số máy đọc được, và nó phụ thuộc GÓI (Pro / Max 5x / Max 20x). Đây là MẪU SỐ
# ước tính — bạn tự hiệu chỉnh từ kinh nghiệm.
#
# Đơn vị: TỔNG token/5h = input + output + cache_creation + CACHE_READ_WEIGHT*cache_read.
# Chỉ cần điền model bạn thực sự dùng; để 0 = bỏ qua model đó.

# =====================================================================
# GỢI Ý KHỞI ĐIỂM CHO GÓI PRO (ước lượng từ đo thực tế, KHÔNG phải số chính thức)
# Cơ sở: 1 phiên ~1.1h tiêu ~3.0M weighted-token (chủ yếu Opus) và chạm trần ~1h.
# => đặt Opus ~3.0M; Sonnet rộng hơn; Haiku rộng nhất (hiếm khi là ràng buộc).
# HÃY HIỆU CHỈNH: chạy 2–3 lần thật, khi CLI báo hết quota mà % của bạn chưa ~100%
# thì HẠ budget model tương ứng; nếu % vọt >100% trước khi bị chặn thì NÂNG lên.
BUDGET_OPUS=3000000
BUDGET_SONNET=4500000
BUDGET_HAIKU=8000000
BUDGET_FABLE=0

# Trọng số token cache-read so với token thường (cache rẻ hơn) — 0.0..1.0
# ĐÂY LÀ CẦN GẠT LỚN NHẤT: cache_read thường chiếm phần lớn token. Nếu thấy % lệch
# nhiều so với thực tế, chỉnh số này trước (thử 0.05–0.2).
CACHE_READ_WEIGHT=0.1

# Ngưỡng % để nhắc wind-down (mặc định 70)
WINDDOWN_THRESHOLD=70
