# PROGRESS.md — Trạng thái dự án

> Cập nhật sau mỗi mốc đáng kể. AI đọc file này để biết đang ở đâu.

## Giai đoạn hiện tại
- GĐ 7 — Hoàn thiện công cụ/khung (tối ưu cấu hình, hướng dẫn tích hợp)

## Đã xong
- ✅ Tạo cấu hình Opusplan tiêu chuẩn (`.claude/settings-shared-opusplan.json`) — dùng chung cho mọi dự án
- ✅ Cập nhật `copy-framework.sh` để copy cấu hình Opusplan vào `_framework-dropins/`
- ✅ Cập nhật `copy-framework.ps1` tương tự cho Windows
- ✅ Viết hướng dẫn chi tiết (`CONG-CU-OPUSPLAN-CHO-DU-AN.md`) về cách sử dụng & tuỳ chỉnh cấu hình
- ✅ **Copy thẳng:** Cấu hình tự động copy vào `.claude/settings.json` (không cần chọn merge)
- ✅ **Chốt chiến lược tối ưu token:** giữ **opusplan** (Opus lập kế hoạch, Sonnet code, Haiku phụ)
      — KHÔNG dùng Fable 5 thuần (đắt, "dao mổ trâu"); Fable/Opus chỉ nâng có chọn lọc lúc cần
- ✅ Push lên nhánh `claude/opusplan-shared-config-rm5ru6`, PR #19

## Đang làm
- (xong)

## Tiếp theo
- Đợi review/merge PR #19

## Quyết định quan trọng (trỏ tới ADR nếu có)
- Cấu hình Opusplan được thêm vào `_framework-dropins/` (an toàn, không đè cấu hình cũ)
- `.claude/` (hooks + agents) cũng được copy vào `_framework-dropins/` để dự án cũ tự merge nếu cần

## Nợ kỹ thuật (chỗ "làm tạm" cần quay lại)
- (không có)

## Bàn giao phiên (điền khi WIND-DOWN gần chạm limit 5h — để phiên sau "tiếp tục")
> Chế độ tự động ghi ở đây trước khi dừng: việc vừa xong, việc DỞ ở đâu, bước kế tiếp cụ thể.
- Lần cập nhật: 2026-07-01
- Việc DỞ / bước tiếp theo: Commit tất cả thay đổi & push lên nhánh `claude/opusplan-shared-config-rm5ru6`
- Cần lưu ý khi chạy tiếp: Kiểm tra 3 file vừa tạo/sửa: `.claude/settings-shared-opusplan.json`, `copy-framework.sh`, `copy-framework.ps1`, `docs/framework/CONG-CU-OPUSPLAN-CHO-DU-AN.md`
