---
description: Lập kế hoạch & phạm vi (GĐ 1) — sinh PROJECT.md: MVP MoSCoW, tiêu chí chấp nhận đo được, DoD, sổ rủi ro; nối greenfield giữa /tu-van và /khoi-tao
---

Dẫn dắt **Giai đoạn 1 — Lập kế hoạch & Phạm vi** (KHUNG-1 GĐ 1), sản phẩm đầu ra là **`PROJECT.md`** đầy đủ + **DoD** + sổ rủi ro. Mục tiêu: định nghĩa **MVP nhỏ nhất nhưng đủ dùng**, đóng băng phạm vi trước khi dựng nền.

> Vị trí trong chuỗi: `/tu-van` (chọn công nghệ, GĐ 0–2) → **`/ke-hoach`** (chốt phạm vi + đặc tả, GĐ 1) → `/khoi-tao` (dựng nền, GĐ 2–3). Nếu chưa rõ vấn đề/người dùng → chạy `/tu-van` PHẦN A trước. **Đọc đúng phần cần của KHUNG-1/2/3, không nạp toàn bộ.**

## Bước 0 — Hồ sơ loại dự án (quyết cổng nào áp dụng)
Xác định **loại dự án → hồ sơ** (KHUNG-3 PHẦN A0, C1–C10). Hồ sơ quyết định **yêu cầu phi chức năng & DoD** đặc thù: hồ sơ có UI web dùng CWV/a11y/theme; backend dùng p95 latency + contract API; CLI/thư viện dùng SemVer + DX; data/ML dùng tái lập + đánh giá mô hình. Dự án nhiều thành phần → mỗi phần một hồ sơ.

## Bước 1 — Phạm vi MVP (MoSCoW)
- Liệt kê mọi tính năng → phân loại **Must / Should / Could / Won't**.
- Mỗi tính năng **Must** có **tiêu chí chấp nhận đo được** (thế nào là "đúng").
- Viết user story: *"Là [ai], tôi muốn [làm gì] để [mục đích gì]."* + vẽ luồng người dùng chính.
- **Cảnh báo phình phạm vi** chủ động; ý tưởng mới → danh sách chờ. **Đóng băng MVP.**

## Bước 2 — Yêu cầu phi chức năng (theo hồ sơ)
Tốc độ mục tiêu, mức bảo mật, accessibility, thiết bị/nền tảng hỗ trợ — ghi **ngưỡng cụ thể** đúng cổng của hồ sơ (BO-SUNG Nhóm 2 mục 2 cho ngân sách hiệu năng web; tương đương cho loại khác).

## Bước 3 — Chốt Definition of Done (DoD) + Definition of Ready (DoR)
- **DoD** (KHUNG-1 GĐ 1): đạt tiêu chí chấp nhận · qua lint/format/type/build · có test logic quan trọng (xanh) · xử lý lỗi/rỗng/tải · không bí mật/rác · đã tự review · merge + deploy thử OK. Điều chỉnh phần đặc thù theo hồ sơ.
- **DoR** (BO-SUNG Nhóm 1 mục 7): một task chỉ **bắt đầu** khi có tiêu chí chấp nhận rõ, không còn câu hỏi mở, phạm vi gói trong một PR.

## Bước 4 — Sổ rủi ro & ghi PROJECT.md
- Sổ rủi ro: giả định nguy hiểm nhất + cách kiểm chứng (KHUNG-1 GĐ 0–1).
- Điền **`PROJECT.md`** (mục 0 Loại dự án & Hồ sơ → mục 10 Rủi ro). Mục 4 (stack) lấy từ `/tu-van` (phiên bản + ngày xác minh). Quyết định lớn → `/adr`.
- Cập nhật `PROGRESS.md`: đang ở GĐ 1, việc tiếp theo.

## Cổng GĐ 1 (xin xác nhận trước khi sang GĐ 2/3)
Mọi tính năng MVP có tiêu chí chấp nhận đo được · DoD + DoR đã chốt · phạm vi đóng băng · sổ rủi ro có. **Đạt đủ → `/khoi-tao`.**

Bắt đầu: chạy **Bước 0 — xác định hồ sơ loại dự án**, rồi đi tiếp.
