---
description: Tạo ADR mới (bản ghi quyết định kiến trúc) từ mẫu, theo phương pháp KHUNG-3 §B3; đánh số tăng dần, không sửa ADR cũ
---

Tạo một **ADR (Architecture Decision Record)** mới cho một quyết định kỹ thuật quan trọng, dựa trên mẫu có sẵn và **phương pháp ra quyết định của KHUNG-3 §B3** (ứng viên đã cân nhắc → tiêu chí → vì sao chọn/loại).

> Khi nào cần ADR: quyết định kiến trúc/công nghệ lớn, khó đảo, ảnh hưởng nhiều nơi. ADR ghi lại **"TẠI SAO"** để bạn (hoặc một phiên AI mới) không vô tình lật ngược quyết định cũ mà không biết lý do.

> 💡 **Model/effort cho ca này:** ghi ADR = quyết định kiến trúc khó đảo, **lý luận sâu**. Cân nhắc nâng thủ công `/model claude-fable-5` (hoặc `claude-opus-4-8`) + `/effort xhigh` khi so sánh ứng viên/đánh đổi; xong quay lại `opusplan` + `/effort medium` cho khỏi phí token. Chi tiết: `docs/framework/models-and-automation.md` §4 (Effort & thinking).

## Bước 1 — Đánh số & đặt tên (không đoán)
1. Đọc `docs/adr/` → tìm số ADR lớn nhất hiện có (vd `0001-...`) → số mới = **kế tiếp**, đệm 4 chữ số.
2. Tên file: `docs/adr/000X-<slug-ngan-gon>.md` (slug không dấu, gạch nối). Tham khảo ví dụ đã điền: `docs/adr/0001-stack-selection.md`.

## Bước 2 — Soạn nội dung theo mẫu
Sao cấu trúc từ `docs/adr/0000-template.md`, điền đủ các mục: **Trạng thái** (Đề xuất / Đã chấp nhận / Đã thay thế bởi ADR-XXXX) · **Ngày** (YYYY-MM-DD) · **Bối cảnh** · **Quyết định** · **Lý do** (phần quan trọng nhất) · **Các phương án đã cân nhắc** (ưu/nhược + vì sao loại) · **Hệ quả** (tích cực / đánh đổi-rủi ro / việc tiếp theo).

## Bước 3 — Áp phương pháp KHUNG-3 §B3 cho mục "Phương án đã cân nhắc" & "Lý do"
- Liệt kê **2–3 ứng viên** thật (không chỉ một).
- Chấm theo tiêu chí §B2 — cân bằng **độ phổ biến ↔ năng lực**.
- Nếu quyết định chạm **phiên bản/thư viện**: tuân **research-first** — xác minh bằng nguồn sống (npm registry / nodejs.org / tài liệu chính thức) và **ghi ngày xác minh**; không khẳng định khả năng API theo trí nhớ.

## Quy tắc bất biến
- **KHÔNG sửa ADR cũ.** Nếu đổi ý: viết ADR mới và đánh dấu ADR cũ "Đã thay thế bởi ADR-XXXX".
- ADR ở trạng thái "Đề xuất" cần **người dùng duyệt** trước khi chuyển "Đã chấp nhận".
- Sau khi tạo: nếu là quyết định stack, đối chiếu/cập nhật `PROJECT.md` mục 4 cho khớp.

Hỏi nhanh **quyết định cần ghi là gì** (nếu chưa rõ), rồi làm **Bước 1**.
