# docs/framework — chỉ mục tài liệu khung

> Tên file dùng tiếng Anh (chuẩn hóa); nội dung tiếng Việt. Trong văn bản, các tên gọi
> **KHUNG-1 / KHUNG-2 / KHUNG-3** vẫn được dùng làm tên khái niệm — bảng dưới là bản đồ tra cứu.

| File | Tên khái niệm (trong văn bản) | Nội dung | Đọc khi nào |
|------|-------------------------------|----------|-------------|
| `01-process-and-standards.md` | **KHUNG-1** | Quy trình 9 giai đoạn + cổng + tiêu chuẩn từng giai đoạn | Bắt đầu dự án; trước khi chuyển giai đoạn |
| `02-ai-rules-and-project-template.md` | **KHUNG-2** | Luật AI (cổng commit/merge, chống ảo giác, báo cáo xác thực) + mẫu `PROJECT.md` | Sinh PROJECT.md/CLAUDE.md; ôn luật |
| `03-tech-selection-and-proactive-advice.md` | **KHUNG-3** | Research-first: chọn công nghệ/phiên bản + đề xuất chủ động 19 khía cạnh + hồ sơ C1–C10 | GĐ 0–2; thêm/đổi công nghệ |
| `new-project-runbook.md` | KHOI-TAO | Runbook dựng dự án MỚI: trình tự 0→9 + cấu hình hàng rào (Phần D) + checklist dự án thật (Phần E) | Greenfield (`/bootstrap`) |
| `existing-project-adoption.md` | AP-DUNG | Áp khung lên dự án CÓ SẴN: tự dò stack, hàng rào tăng dần, không big-bang (Bước 0→4) | Brownfield (`/consult`) |
| `project-completion.md` | HOAN-THIEN | Hoàn thiện dự án: bản đồ tính năng + kế hoạch chi tiết + vòng hội tụ + Definition of Complete | Muốn hết lỗi đã biết (`/completion`) |
| `quality-supplements.md` | BO-SUNG | Bổ sung chất lượng: Nhóm 1 (env/migration/ADR/DoR), Nhóm 2 (mobile/CWV/E2E+a11y/UI-UX/chống lỗi logic/tối ưu), theme, i18n/PWA/Sentry/SEO | Tra checklist chi tiết |
| `models-and-automation.md` | MODEL | Chọn model (Sonnet/Opus/Fable) + effort + bản đồ chế độ chạy tự động | Bắt đầu/đổi quy mô; cân chi phí |

## Tên cũ (tiếng Việt) → tên mới — cho dự án đã copy khung bản trước

| Tên cũ | Tên mới |
|--------|---------|
| `KHUNG-1-quy-trinh-va-tieu-chuan.md` | `01-process-and-standards.md` |
| `KHUNG-2-luat-AI-va-mau-du-an.md` | `02-ai-rules-and-project-template.md` |
| `KHUNG-3-chon-cong-nghe-va-de-xuat-chu-dong.md` | `03-tech-selection-and-proactive-advice.md` |
| `KHOI-TAO-du-an-moi.md` | `new-project-runbook.md` |
| `AP-DUNG-vao-du-an-co-san.md` | `existing-project-adoption.md` |
| `BO-SUNG-chat-luong.md` | `quality-supplements.md` |
| `MODEL-va-TU-DONG.md` | `models-and-automation.md` |
| `docs/ops/audit-toan-dien-prompt.md` | `docs/ops/comprehensive-audit-prompt.md` |
| `docs/ops/audit-toi-uu-prompt.md` | `docs/ops/code-optimization-audit-prompt.md` |
| `docs/ops/AUDIT-TOAN-DIEN-TRANG-THAI.md` | `docs/ops/COMPREHENSIVE-AUDIT-STATUS.md` |
| `docs/adr/0001-chon-stack.md` | `docs/adr/0001-stack-selection.md` |

## Slash command cũ → mới

| Cũ | Mới | | Cũ | Mới |
|----|-----|-|----|-----|
| `/tu-van` | `/consult` | | `/audit-toan-dien` | `/audit-full` |
| `/cong` | `/gate` | | `/audit-toi-uu` | `/audit-optimize` |
| `/khoi-tao` | `/bootstrap` | | `/su-co` | `/incident` |
| `/tu-dong` | `/auto` | | *(mới)* | `/completion` |

Subagent: `tra-cuu` → `lookup` · `kiem-tra-phien-ban` → `version-check` · `thuc-thi` → `executor`.
