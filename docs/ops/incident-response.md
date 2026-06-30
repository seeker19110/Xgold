# Runbook: Xử lý sự cố (Incident Response)

> Cụ thể hóa "Quy trình xử lý sự cố rõ ràng" của KHUNG 1 (GĐ 8 — Sau ra mắt).
> Mục tiêu: khi production có sự cố, **giảm thiệt hại trước, tìm nguyên nhân sau** — theo các bước cố định
> để không phải suy nghĩ lúc đang hoảng.

## Phân mức nghiêm trọng (severity)

| Mức | Nghĩa | Ví dụ | Phản hồi |
|-----|-------|-------|----------|
| **SEV1** | Sập/mất dữ liệu/lộ dữ liệu | site down, rò rỉ dữ liệu, mất tiền | Xử lý ngay, mọi lúc |
| **SEV2** | Suy giảm nặng | luồng chính lỗi, chậm nghiêm trọng | Trong giờ làm, ưu tiên cao |
| **SEV3** | Ảnh hưởng nhỏ | lỗi ngoài luồng chính, có cách lách | Lên lịch xử lý |

## Các bước (theo thứ tự)

1. **Phát hiện & ghi nhận.** Mở một issue sự cố (template `incident`); ghi thời điểm bắt đầu, triệu chứng,
   ai đang xử lý. Nguồn cảnh báo: Sentry, uptime monitor, người dùng báo.
2. **Đánh giá mức (severity)** theo bảng trên. SEV1 → ưu tiên tuyệt đối.
3. **Giảm thiệt hại trước (mitigate).** Ưu tiên khôi phục dịch vụ hơn là vá triệt để:
   - **Rollback** bản deploy gần nhất (Vercel: Promote bản trước đó), HOẶC
   - Tắt cờ tính năng/feature flag gây lỗi, HOẶC
   - Khôi phục dữ liệu từ **backup/PITR** (nếu mất/hỏng dữ liệu).
4. **Liên lạc.** Cập nhật trạng thái cho người dùng nếu ảnh hưởng diện rộng (trang status/thông báo).
5. **Khắc phục triệt để.** Sửa nguyên nhân gốc theo đúng quy trình: nhánh `fix/...` → cổng commit/merge → deploy.
6. **Đóng sự cố.** Xác nhận đã hết triệu chứng; ghi thời điểm kết thúc.
7. **Viết post-mortem** (template `docs/ops/POSTMORTEM-template.md`) cho mọi SEV1/SEV2 — **không đổ lỗi cá nhân**,
   tập trung vào hệ thống. Mọi hành động khắc phục → tạo issue có người phụ trách + hạn.

## Nguyên tắc

- **An toàn trước tốc độ:** thao tác lên dữ liệu thật phải cân nhắc rollback trước khi chạy.
- **Một người điều phối (incident lead)** ngay cả khi làm nhóm nhỏ — tránh giẫm chân nhau.
- **Mọi thay đổi lúc chữa cháy vẫn ghi lại** để post-mortem tái dựng được dòng thời gian.
- Mỗi sự cố để lại **ít nhất một cải tiến** (test hồi quy, cảnh báo mới, hàng rào mới) để không lặp lại.
