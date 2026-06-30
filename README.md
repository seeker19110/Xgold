# Bộ khung phát triển dự án (drop-in)

Giải nén bộ này vào **gốc repo** của một dự án Next.js mới (đã tạo bằng
`create-next-app` với TypeScript + Tailwind + ESLint). Phần lớn file đã ở đúng chỗ;
phần cài gói + sửa `package.json`/`tsconfig` làm theo runbook (Phần D).

## Bắt đầu từ đâu
Đọc **`docs/framework/KHOI-TAO-du-an-moi.md`** — runbook chỉ rõ làm gì theo thứ tự và
phải tuân thủ gì. Đó là kim chỉ nam chính.

## File đã sẵn sàng (chỉ cần giải nén)
- `CLAUDE.md` — luật cho AI (Claude Code tự đọc). **Nhớ điền các chỗ `[ĐIỀN: ...]`.**
- `PROJECT.md` — mẫu đặc tả dự án (điền trước khi code).
- `PROGRESS.md` — mẫu theo dõi trạng thái.
- `lib/env.ts` — xác thực biến môi trường (đổi tên biến cho khớp dự án).
- `styles/theme.css` — design tokens: nền **Dark blue** mặc định + chế độ **Light**.
- `playwright.config.ts`, `e2e/smoke.spec.ts` — E2E (desktop + mobile) + quét a11y axe.
- `lighthouserc.json` — ngân sách hiệu năng (Lighthouse CI).
- `CHANGELOG.md` — lịch sử thay đổi (Keep a Changelog).
- `eslint.config.mjs` — ESLint **flat config** (ESLint 9/10, Next 16; thay `.eslintrc.json` cũ).
- `postcss.config.mjs` — Tailwind v4 (`@tailwindcss/postcss`).
- `.nvmrc` (Node 22), `.editorconfig`, `.env.example` — đồng bộ môi trường/biến.
- `app/` — starter: `not-found.tsx`, `error.tsx`, `global-error.tsx` (trang lỗi), `robots.ts`,
  `sitemap.ts` (SEO), `manifest.ts` + `sw.ts` (PWA).
- `i18n/request.ts`, `messages/{vi,en}.json` — đa ngôn ngữ (next-intl).
- `.prettierrc`, `.prettierignore`, `commitlint.config.cjs`,
  `.lintstagedrc.json`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`
- `.husky/pre-commit`, `.husky/commit-msg` — hook (cần chạy `npx husky init` trước, xem dưới).
- `components/theme-toggle.tsx` — nút chuyển theme (Dark blue ↔ Light) dùng ngay.
- `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/` (gồm mẫu **sự cố**),
  `.github/dependabot.yml`, `.github/CODEOWNERS`, và các workflow:
  `ci.yml` (lint/type/format/test+coverage/build/audit + **E2E** + chặn `[ĐIỀN]`),
  `lighthouse-ci.yml`, `codeql.yml` (SAST), `secret-scan.yml` (gitleaks), `release.yml` (release-please).
- `supabase/migrations/` — **migration MẪU** (bảng + ràng buộc + index + **RLS + policy**); `supabase/README.md`.
- `LICENSE` (MIT — đổi chủ sở hữu/giấy phép theo dự án), `SECURITY.md`, `CONTRIBUTING.md`.
- `docs/framework/` — 6 tài liệu khung: **KHUNG-1/2/3** (quy trình · luật AI · chọn công nghệ research-first);
  **KHOI-TAO-du-an-moi** (runbook: trình tự + cấu hình hàng rào *Phần D* + checklist dự án thật *Phần E*);
  **AP-DUNG-vao-du-an-co-san** (brownfield); **BO-SUNG-chat-luong** (Nhóm 1+2 + theme + nâng cao i18n/PWA/Sentry/SEO/analytics).
- `docs/ops/incident-response.md` — vận hành GĐ 8: xử lý sự cố + **mẫu post-mortem**.
- `docs/adr/0000-template.md` — mẫu ghi quyết định kỹ thuật (ví dụ đã điền: `0001-chon-stack.md`).

## Mang khung sang một dự án khác
Dùng `copy-framework.sh` (chép tài liệu khung + `CLAUDE.md` sang dự án đích, không đè cấu hình
đang chạy — đưa vào `_framework-dropins/` để tự merge):
```bash
bash copy-framework.sh /đường-dẫn/tới/dự-án
```
Chi tiết cho dự án đã phát triển: `docs/framework/AP-DUNG-vao-du-an-co-san.md`.

## Việc phải làm tay (không đè được file của create-next-app)
Theo **`docs/framework/KHOI-TAO-du-an-moi.md` Phần D**: cài gói + thêm khối `scripts` + `npx husky init`;
thêm các cờ TypeScript `strict` vào `tsconfig.json`.

> Sau đó làm tiếp theo runbook: bật branch protection + Code scanning trên GitHub, kết nối Supabase,
> deploy thử Vercel, rồi **kiểm chứng hàng rào** (thử commit sai phải bị chặn) trước khi code tính năng.
> Danh mục đầy đủ việc-dự-án-thật: Phần E của runbook.

## Lưu ý
- ESLint dùng **flat config** (`eslint.config.mjs`) cho ESLint 9/10 + Next 16. Nếu phiên bản Next/ESLint
  của bạn khác, đối chiếu lại cách `eslint-config-next` xuất config (FlatCompat vs flat gốc).
- README này KHÔNG cần commit vào dự án thật — xóa sau khi setup xong nếu muốn.
