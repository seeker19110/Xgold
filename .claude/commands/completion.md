---
description: Hoàn thiện dự án — lập kế hoạch chi tiết từ hiện trạng + audit, thực thi từng đợt qua cổng, re-audit hội tụ đến khi không còn lỗi đã biết, nghiệm thu theo Definition of Complete
---

Đọc kỹ `docs/framework/project-completion.md` trong repo này và **làm theo đúng 5 pha trong đó**.

> 💡 **Model/effort:** lập kế hoạch hoàn thiện (Pha 2) là việc lý luận sâu — Plan Mode/opusplan đã
> dùng Opus; ca đặc biệt phức tạp cân nhắc `/model claude-fable-5` + `/effort xhigh` cho riêng Pha 2,
> xong quay lại `opusplan`. Việc quét/đo cơ học giao subagent (`lookup`, `version-check`).

Ràng buộc bắt buộc (chi tiết nằm ở file trên — bám `CLAUDE.md` §3–§4, cổng §5–§7):

- **Bước -1 (mượn từ `/audit-full`):** xác nhận đây là **dự án cụ thể đã phát triển**, không phải
  khung/template trống. Nếu trống → DỪNG, giải thích, gợi ý `/consult` hoặc `/bootstrap`.

- **Bước 0 — kiểm tra trạng thái trước khi làm bất cứ gì:** đọc `docs/ops/COMPLETION-PLAN.md` nếu có.
  - **Đã có kế hoạch đang mở** → tóm tắt trạng thái (đợt nào xong, việc nào 🔄/⬜), rồi **DÙNG
    `AskUserQuestion` hỏi**: tiếp tục đúng chỗ dở, hay lập lại kế hoạch từ đầu? Không tự quyết.
  - **Chưa có** → chạy từ Pha 0.

- **Trình tự pha — không bỏ pha, không đảo:**
  - **Pha 0** dò hiện trạng: nếu chưa áp khung thì chạy Bước 0 của `existing-project-adoption.md`;
    lập `docs/FEATURE-MAP.md` + `docs/CONVENTIONS.md` bằng cách **đọc code thật** (chống ảo giác).
  - **Pha 1** quét: chạy `/audit-full` (12 nhóm, gồm Nhóm 12 thống nhất chéo tính năng). KHÔNG sửa gì.
  - **Pha 2** lập `docs/ops/COMPLETION-PLAN.md` (đợt + việc + tiêu chí nghiệm thu + truy vết F-xxx→W-xxx
    + Definition of Complete) → **DỪNG, chờ người dùng duyệt kế hoạch + DoC**. Chưa duyệt chưa sửa.
  - **Pha 3** thực thi từng việc: nhánh riêng → PR nhỏ → `/gate`; bug có **test tái hiện trước khi
    sửa**; cập nhật COMPLETION-PLAN **ngay sau mỗi việc** (trạng thái + PR + bằng chứng).
  - **Pha 4** hội tụ: quét lại nhóm bị ảnh hưởng sau mỗi đợt; sau đợt cuối quét lại đủ 12 nhóm;
    chỉ đóng khi đạt tiêu chí thoát (0 phát hiện Cao mở; Trung/Thấp có quyết định ghi nhận; lượt
    quét cuối không ra phát hiện Cao mới) → nghiệm thu từng mục Definition of Complete kèm bằng chứng.

- **Vẫn dừng và hỏi** theo `CLAUDE.md` §9 (mơ hồ, không hoàn tác được, breaking change, bảo mật/
  thanh toán/dữ liệu thật) — kể cả đang ở giữa Pha 3.

Nếu **không tìm thấy** `docs/framework/project-completion.md` (repo chưa áp khung), báo người dùng
cân nhắc chạy `copy-framework.sh`, rồi vẫn tiến hành theo đúng 5 pha tóm tắt trên.

Bắt đầu **Bước -1** ngay.
