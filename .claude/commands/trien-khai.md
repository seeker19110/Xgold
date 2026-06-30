---
description: Triển khai & ra mắt (GĐ 6–7) — cổng CI/CD trước production, migration/backup/rollback, checklist ra mắt (pháp lý, SEO, trang lỗi, onboarding)
---

Dẫn dắt **Giai đoạn 6 (Triển khai)** và **Giai đoạn 7 (Ra mắt)** (KHUNG-1). Mục tiêu: đưa lên production **an toàn, có thể quay lại được**, rồi đến tay người dùng thật. **An toàn trước tốc độ.**

> Nền tảng: KHUNG-1 GĐ 6–7 + `BO-SUNG-chat-luong.md` Nhóm 1 mục 2 (migration), mục 6 (Preview làm staging), Nhóm 2 mục 2 (Lighthouse), mục 7 (Sentry), PHẦN 4 (SEO/analytics). Cổng thay đổi theo **hồ sơ** (KHUNG-3 PHẦN C). **Đọc đúng phần cần.**

## A. GĐ 6 — Triển khai

### Cổng chất lượng CI/CD (phải đạt trước production)
- Toàn bộ test xanh (gồm E2E của hồ sơ), build OK, **không lỗi type/lint** — chạy `/cong merge`.
- Hồ sơ web: **Lighthouse CI xanh** (CWV trong ngưỡng). Backend: tải thử đạt p95. Khác: cổng tương đương.
- Audit bảo mật: không còn lỗ hổng nghiêm trọng (`npm audit`/SAST/secret-scan).

### Vận hành (không thể hoàn tác → cẩn trọng, xin xác nhận)
- **Migration** có phiên bản, chạy được và **rollback được** (BO-SUNG Nhóm 1 mục 2). Đổi schema phá vỡ → dừng & hỏi (CLAUDE.md §9).
- Kiểm soát truy cập (RLS/ACL) **đã bật và test** trước khi mở cho người ngoài.
- **Giám sát + theo dõi lỗi** (vd Sentry) + cảnh báo đã hoạt động.
- **Backup tự động đã bật và đã thử khôi phục một lần.** Kế hoạch rollback rõ ràng.
- Có **staging** giống production (vd Vercel Preview) để thử lần cuối; **không test trên dữ liệu thật**.

**Cổng GĐ 6:** CI/CD đạt · backup khôi phục được · rollback sẵn sàng.

## B. GĐ 7 — Ra mắt

### Checklist trước khi công khai (hồ sơ có người dùng cuối)
- **Pháp lý:** privacy policy + terms (đặc biệt nếu thu thập dữ liệu cá nhân — GDPR/Nghị định 13).
- **SEO** (web): meta/title/Open Graph, sitemap, robots.txt (BO-SUNG PHẦN 4 mục 4).
- **Analytics** đã cài (PHẦN 4 mục 7). **Trang lỗi thân thiện** (404/500). **Onboarding** rõ cho người mới.
- Kiểm tra **luồng quan trọng trên production thật** lần cuối. Có **kênh nhận phản hồi/báo lỗi**.
- CLI/thư viện: thay "ra mắt web" bằng **xuất bản gói** (npm/PyPI/crates) + README/CHANGELOG + SemVer + ghi chú phát hành.

### Quy trình
Soft launch (nhóm nhỏ) → sửa vấn đề nghiêm trọng → public launch → quảng bá đúng kênh → **theo dõi sát 48 giờ đầu**.

**Cổng GĐ 7:** người lạ tự dùng được từ link/bản phát hành công khai mà không cần bạn bên cạnh.

## Kết
Cập nhật `PROGRESS.md` (sang GĐ 8). Có sự cố sau ra mắt → `/su-co`. Đây là chuỗi thao tác **đụng dịch vụ ngoài & khó hoàn tác** — đi từng bước, xin xác nhận trước mỗi thao tác tạo tài nguyên/đổi cấu hình từ xa.

Bắt đầu: xác định đang ở GĐ 6 hay GĐ 7 + hồ sơ dự án, rồi chạy cổng tương ứng (GĐ 6 trước GĐ 7).
