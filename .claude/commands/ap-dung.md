---
description: Áp khung vào dự án CÓ SẴN (brownfield) — chỉ tư vấn & nâng cấp trên stack hiện có, KHÔNG áp đặt stack mặc định; tăng dần, đo baseline rồi hạ nợ
---

Dẫn dắt **áp bộ khung lên một dự án đã phát triển** theo runbook `docs/framework/AP-DUNG-vao-du-an-co-san.md`. Mục tiêu: mang **kỷ luật + cổng + chống lỗi** vào codebase đang chạy mà **không làm lại từ đầu**.

> **Nguyên tắc số 0 (bất biến): CHỈ tư vấn & nâng cấp — KHÔNG áp đặt stack.** Khung không thay/ép stack mặc định (Next/Supabase/Vercel) hay "hồ sơ" nào lên dự án có sẵn. AI **đọc repo để biết stack thật** rồi cải thiện **tăng dần trên chính stack đó**; chỉ đề xuất đổi/thêm công nghệ khi có lý do rõ và **người dùng chốt**. (Khác hẳn `/khoi-tao` dành cho dự án mới.)

## Bước 0 — AI TỰ XÁC ĐỊNH hiện trạng (đọc repo, không hỏi điều đã có trong code)
Dò stack bằng **file thật** (chống ảo giác — CLAUDE.md §4): `package.json` + lockfile (framework/thư viện/phiên bản/lệnh), `*.config.*`, `tsconfig.json` (đã `strict`?), config CSS/CSDL/test, `.github/workflows/`, `.husky/`, `.env*`/`.gitignore`. Tổng hợp **"Hồ sơ dự án"** + bảng **đã có vs còn thiếu**; trình bày để người dùng xác nhận. Viết `PROJECT.md` **ngược** + `PROGRESS.md` (thường GĐ 4–5 hoặc GĐ 8) + `CLAUDE.md` điền **đúng stack/lệnh thật** (không để `[ĐIỀN]`). **Chỉ hỏi** thứ không suy ra được từ code (bối cảnh nghiệp vụ, ưu tiên/đánh đổi).

## Bước 1 — Dựng hàng rào lên code có sẵn (an toàn, KHÔNG đổi hành vi)
Thứ tự tăng dần để không "ngộp lỗi": **Prettier** (format toàn bộ trong 1 commit riêng) → **ESLint** mức *cảnh báo* trước, siết dần → **TypeScript strict tăng dần** (bật từng cờ, `// @ts-expect-error` + ghi nợ chỗ chưa kịp) → **Husky + lint-staged** (chỉ file staged) → **commitlint** cho commit mới → **CI** (cho `continue-on-error` tạm nếu còn nhiều nợ) → **branch protection**.

## Bước 2 — Lấp lỗ hổng chất lượng (đo baseline → cải thiện dần)
**Test** phần quan trọng/hay đổi nhất trước (mỗi bug cũ → 1 test hồi quy) · **E2E** 1–2 luồng chính · **Lighthouse/cổng hồ sơ**: đo baseline, đặt budget "không tệ hơn hiện tại" · **a11y** (axe, sửa theo mức nghiêm trọng) · **theme/mobile** retrofit dần sang tokens (không viết lại UI) · **observability** (Sentry) sớm · **tối ưu mã nguồn** đo baseline rồi hạ dần → `/audit-toi-uu` · **migration**: baseline schema hiện tại thành migration đầu.

## Bước 3 — Vận hành theo khung từ đây
Mọi việc mới: **DoR → cổng commit (`/cong`) → DoD → cổng merge** + báo cáo xác thực. Code cũ: **"đụng đâu dọn đó"**, ghi nợ kỹ thuật vào `PROGRESS.md`. Đổi/thêm công nghệ lớn: **research-first (`/tu-van`) + ADR (`/adr`)**.

## Bản đồ "dùng ngay vs cần thay" (theo stack — PHẦN C của runbook)
**Lớp 1 (quy trình/cổng/chống lỗi logic): dùng ngay, bất kể stack.** **Lớp 2 (file cấu hình Next/Tailwind/Supabase): chỉ áp phần khớp**, khác stack thì lấy *ý tưởng* + thay công cụ tương đương. Không phải web → bỏ phần web (Lighthouse/theme/PWA), giữ cổng/DoR/DoD/logic.

## Cổng "đã áp khung xong"
`PROJECT.md` (ngược) + `PROGRESS.md` + `CLAUDE.md` (điền thật) · hook chặn được lỗi commit mới · CI + branch protection bật · có baseline + kế hoạch hạ nợ · tính năng mới đầu tiên đã đi trọn DoR → DoD → merge.

Bắt đầu: chạy **Bước 0 — tự dò stack từ repo** (không hỏi điều đã có trong code), trình "Hồ sơ dự án" cho người dùng xác nhận.
