# Bộ khung phát triển dự án (drop-in)

Giải nén bộ này vào **gốc repo** của một dự án Next.js mới (đã tạo bằng
`create-next-app` với TypeScript + Tailwind + ESLint). Phần lớn file đã ở đúng chỗ;
chỉ 2 file cần gộp tay (xem bên dưới).

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
- `docs/framework/` — 9 tài liệu khung (quy trình, luật AI, **chọn công nghệ research-first**,
  cấu hình, runbook dự án mới, **áp vào dự án có sẵn**, bổ sung chất lượng Nhóm 1 & 2, theme,
  **nâng cao i18n/PWA/Sentry/SEO**).
- `docs/ops/` — vận hành GĐ 8: runbook **xử lý sự cố** + mẫu **post-mortem**.
- `docs/adr/0000-template.md` — mẫu ghi quyết định kỹ thuật.

## Mang khung sang một dự án khác
Dùng `copy-framework.sh` (chép tài liệu khung + `CLAUDE.md` sang dự án đích, không đè cấu hình
đang chạy — đưa vào `_framework-dropins/` để tự merge):
```bash
bash copy-framework.sh /đường-dẫn/tới/dự-án
```
Chi tiết cho dự án đã phát triển: `docs/framework/AP-DUNG-vao-du-an-co-san.md`.

## 2 việc phải làm tay
1. `MERGE-vao-package.json.md` — cài gói + thêm khối `scripts` + `npx husky init`.
2. `MERGE-vao-tsconfig.json.md` — thêm các cờ TypeScript strict.

> Sau khi gộp xong, làm tiếp theo runbook (`docs/framework/KHOI-TAO-du-an-moi.md`):
> bật branch protection trên GitHub, kết nối Supabase, deploy thử Vercel, rồi
> **kiểm chứng hàng rào** (thử commit sai phải bị chặn) trước khi code tính năng.

## Lưu ý
- ESLint dùng **flat config** (`eslint.config.mjs`) cho ESLint 9/10 + Next 16. Nếu phiên bản Next/ESLint
  của bạn khác, đối chiếu lại cách `eslint-config-next` xuất config (FlatCompat vs flat gốc).
- Hai file MERGE và README này KHÔNG cần commit — xóa sau khi setup xong nếu muốn.
