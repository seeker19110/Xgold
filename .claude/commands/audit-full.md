---
description: Audit toàn diện mọi khía cạnh dự án — quét lại từ đầu hoặc tiếp tục phần chưa xong
---

Đọc kỹ `docs/ops/comprehensive-audit-prompt.md` trong repo này và **làm theo đúng quy trình trong đó**.

Ràng buộc bắt buộc (chi tiết & danh sách 12 nhóm nằm ở file trên — bám đúng `CLAUDE.md` §3–§4,
`KHUNG-3` PHẦN C (hồ sơ theo loại dự án), `quality-supplements.md` Nhóm 1+2, `KHUNG-1` tiêu chuẩn
từng giai đoạn):

- Đây là **AUDIT TOÀN DIỆN** — khác `/audit-optimize` (vốn chỉ tối ưu mã nguồn: dead code/trùng
  lặp/dependency/bundle). Audit này rà **mọi khía cạnh**: kiến trúc, bảo mật, chất lượng mã &
  chống lỗi logic, test/coverage, hiệu năng, accessibility/UI-UX, dependency & chuỗi cung ứng,
  CI/CD & vận hành, tài liệu có đồng bộ code thật không, dữ liệu/migration, cấu hình & bí mật,
  **thống nhất chéo tính năng** (Nhóm 12 — cần `docs/FEATURE-MAP.md`; muốn đi trọn vòng hoàn
  thiện đến "không còn lỗi đã biết" → dùng `/completion`).

- **BƯỚC -1 — bắt buộc TRƯỚC CẢ Bước 0:** xác nhận đây là **dự án cụ thể đã phát triển** (có
  tính năng + công nghệ đã chọn/triển khai thật), không phải bộ khung/template còn trống (xem
  dấu hiệu nhận biết trong `comprehensive-audit-prompt.md`). Nếu vẫn là khung trống → **DỪNG NGAY**,
  giải thích cho người dùng rằng audit toàn diện cần một dự án cụ thể mới lập được kế hoạch chi
  tiết, gợi ý `/consult` hoặc `/bootstrap` để bắt đầu phát triển — **không** tự bịa phát hiện/kế
  hoạch audit cho tính năng chưa tồn tại.

- **BƯỚC 0 — bắt buộc trước khi quét bất cứ gì (chỉ khi đã qua Bước -1):** kiểm tra `docs/ops/COMPREHENSIVE-AUDIT-STATUS.md`.
  - **Chưa có** → đây là lần quét đầu; tạo file mới (mẫu trong `comprehensive-audit-prompt.md`), bắt đầu Nhóm 1.
  - **Đã có** → đọc trạng thái, tóm tắt cho người dùng (nhóm nào xong/đang dở/chưa quét), rồi
    **DÙNG `AskUserQuestion` hỏi rõ**: quét lại từ đầu (reset) hay chỉ tiếp tục các nhóm
    chưa xong? Không tự quyết thay người dùng.

- **GIAI ĐOẠN 1 (quét — chỉ đọc & đo, KHÔNG sửa gì):** quét từng nhóm áp dụng theo đúng thứ tự,
  **cập nhật `docs/ops/COMPREHENSIVE-AUDIT-STATUS.md` ngay sau mỗi nhóm** (kể cả khi mới quét dở
  một nhóm) để lần sau tiếp tục đúng chỗ. Sau khi hết các nhóm áp dụng → tổng hợp **BÁO CÁO AUDIT
  TOÀN DIỆN** (vị trí · mức độ · đề xuất · rủi ro · công sức ước tính, xếp ưu tiên) — **rồi DỪNG,
  chờ người dùng duyệt.**
- Chỉ sang **GIAI ĐOẠN 2 (xử lý)** sau khi được duyệt: từng PR nhỏ theo ưu tiên, qua đúng cổng
  `/gate`, cập nhật lại file trạng thái + `PROGRESS.md` sau mỗi mục đã xử lý.

Nếu **không tìm thấy** `docs/ops/comprehensive-audit-prompt.md` (repo chưa áp khung), báo cho người
dùng biết file chưa có để cân nhắc chạy `copy-framework.sh`, rồi vẫn tiến hành theo đúng ràng buộc
tóm tắt trên bằng cách tự suy ra 12 nhóm audit từ tên gọi.

Bắt đầu **BƯỚC -1** ngay.
