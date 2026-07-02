---
description: Khởi tạo dự án mới (greenfield) — chạy runbook KHOI-TAO theo trình tự, dựng hàng rào chống lỗi đến cổng "Sẵn sàng phát triển"
---

Dẫn dắt **khởi tạo một dự án mới** theo runbook `docs/framework/new-project-runbook.md`. Mục tiêu cuối: đạt **cổng "Sẵn sàng phát triển"** (Phần C) — ba tầng phòng thủ (AI kỷ luật + hook cục bộ + CI) đã bật — rồi mới code tính năng (GĐ 4).

> Nối tiếp `/consult`: `/consult` lo **chọn công nghệ** (GĐ 0–2, research-first); `/bootstrap` lo **dựng nền** (GĐ 2–3). Nếu chưa chốt stack → chạy `/consult` trước. **Đọc đúng phần cần của runbook, không nạp toàn bộ.**

## Trình tự (bám Phần A của runbook — 0 → 9)
- **Bước 0:** đưa khung vào repo (hoặc đã có sẵn) — đối chiếu cấu trúc chuẩn ở Phần 0.
- **Bước 1:** viết `PROJECT.md` (Mẫu định nghĩa dự án — KHUNG-2): vấn đề, người dùng, MVP (MoSCoW), yêu cầu phi chức năng, stack, schema, kiến trúc/API, DoD, rủi ro. **Chạy KHUNG-3 research-first** + ghi ADR (dùng `/adr`).
- **Bước 2:** điền `CLAUDE.md` mục 10 (lệnh & quy ước riêng của dự án — thay hết `[ĐIỀN: ...]`).
- **Bước 3:** khởi tạo dự án + Git (nhánh, .gitignore, .nvmrc).
- **Bước 4:** **dựng hàng rào tự động** — cấu hình chi tiết 14 bước ở **Phần D** (ESLint flat, TS strict, Husky pre-commit, lint-staged, commitlint, Vitest, Playwright+a11y, Lighthouse CI, `lib/env.ts`, GitHub Actions, Dependabot, secret-scan).
- **Bước 5:** file bổ sung chất lượng — `styles/theme.css` (Dark blue mặc định + Light, no-flash), i18n nếu cần (BO-SUNG PHẦN 3–4).
- **Bước 6:** bật **branch protection** (GitHub UI).
- **Bước 7:** kết nối CSDL + **migration đầu tiên** (có phiên bản, rollback được).
- **Bước 8:** deploy thử "Hello World" (vd Vercel) — xác nhận pipeline chạy.
- **Bước 9:** **kiểm chứng hàng rào** — thử commit code sai kiểu/sai format/sai commit message **phải bị chặn**; nếu không bị chặn → quay lại Bước 4/6.

## Bất biến (Phần B của runbook + CLAUDE.md §3)
TypeScript `strict` không `any` · validate dữ liệu ngoài (Zod) · bí mật qua biến môi trường, không commit `.env` · conventional commits + PR (không push thẳng nhánh chính) · mobile-first + ngân sách CWV · theme Dark blue + Light · **research-first**: phiên bản ổn định đã xác minh bằng nguồn sống.

## Cổng "Sẵn sàng phát triển" (Phần C — kiểm trước khi viết code tính năng)
Hook cục bộ chặn được lỗi · CI xanh trên PR mẫu · branch protection bật · `PROJECT.md` + ≥1 ADR đã có · theme + env validation hoạt động. **Đạt đủ → chuyển GĐ 4**; cập nhật `PROGRESS.md`.

> Đây là chuỗi nhiều bước, có việc đụng dịch vụ ngoài (GitHub/hosting/CSDL) và **không thể hoàn tác** — đi **từng bước**, **xin xác nhận trước** các bước tạo tài nguyên/đổi cấu hình từ xa (CLAUDE.md §9).

Bắt đầu: xác nhận đã chốt stack chưa (nếu chưa → `/consult`), rồi vào **Bước 0**.
