# Bộ khung phát triển dự án (drop-in)

## Phạm vi: hỗ trợ MỌI loại dự án lập trình (trừ dự án "cấm")

Khung này hỗ trợ **phát triển mọi loại dự án phần mềm từ ý tưởng đến ra mắt** — không chỉ web app:
**web, mobile native, desktop, backend/API/dịch vụ, site nội dung tĩnh, CLI/thư viện/SDK, data/ML/AI, game,
blockchain, monorepo** (và loại chưa liệt kê). Cách hoạt động:

- **Phương pháp là phổ quát:** quy trình 9 giai đoạn + cổng, research-first, đề xuất chủ động mọi mặt, ADR,
  chống ảo giác, báo cáo xác thực — áp cho **mọi loại dự án, mọi ngôn ngữ/stack** (`docs/framework/KHUNG-1/2/3`).
- **Công nghệ chọn theo "hồ sơ loại dự án":** từ ý tưởng, AI **phân loại → chọn hồ sơ → chọn stack** (research-first,
  phiên bản đã xác minh). Bảng hồ sơ C1–C10 + cổng tương đương: `KHUNG-3 PHẦN A0 + PHẦN C`.
- **Các file cấu hình kèm theo là hồ sơ Web app (mặc định)** — Next.js + TS + Tailwind + Supabase + Vercel. Với loại
  khác, giữ phương pháp + thay công cụ tương đương (test/đóng gói/CI của loại đó).
- **Dự án có sẵn (brownfield):** khung **chỉ tư vấn & nâng cấp** trên stack hiện có, **không áp đặt** stack mặc định
  (`docs/framework/existing-project-adoption.md`).
- **Ngoại lệ — dự án "cấm" (không hỗ trợ):** mã độc, phá hoại, DoS, nhắm mục tiêu hàng loạt, tấn công chuỗi cung ứng,
  né tránh phát hiện vì mục đích xấu, hay việc phạm pháp/xâm phạm quyền riêng tư. Bảo mật **phòng thủ** / kiểm thử
  **có ủy quyền** / CTF / nghiên cứu thì hỗ trợ (xem `CLAUDE.md` §0b).

> **Hồ sơ Web app — drop-in nhanh:** giải nén bộ này vào **gốc repo** của một dự án Next.js mới (đã tạo bằng
> `create-next-app` với TypeScript + Tailwind + ESLint). Phần lớn file đã ở đúng chỗ;
> phần cài gói + sửa `package.json`/`tsconfig` làm theo runbook (Phần D).

## Bắt đầu từ đâu
Đọc **`docs/framework/new-project-runbook.md`** — runbook chỉ rõ làm gì theo thứ tự và
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
- `docs/framework/` — tài liệu khung: **01/02/03** (quy trình · luật AI · chọn công nghệ research-first);
  **new-project-runbook** (runbook: trình tự + cấu hình hàng rào *Phần D* + checklist dự án thật *Phần E*);
  **existing-project-adoption** (brownfield); **project-completion** (kế hoạch hoàn thiện + vòng hội tụ);
  **quality-supplements** (Nhóm 1+2 + theme + nâng cao i18n/PWA/Sentry/SEO/analytics).
- `docs/ops/incident-response.md` — vận hành GĐ 8: xử lý sự cố + **mẫu post-mortem**.
- `docs/adr/0000-template.md` — mẫu ghi quyết định kỹ thuật (ví dụ đã điền: `0001-stack-selection.md`).

## Đã có repo khung này — giờ làm gì?
Bạn đã clone/tải repo khung về máy. Chọn đúng một nhánh:

- **Dự án MỚI (greenfield):** dựng dự án từ khung → theo `docs/framework/new-project-runbook.md` (runbook 0→9).
- **Dự án ĐÃ CÓ (brownfield):** mang khung sang dự án đích rồi mở Claude Code trong đó — các bước bên dưới.

### Bước 1 — Mang khung sang dự án đích (một lệnh)
Đứng **trong repo khung này**, trỏ tới thư mục gốc của dự án đích. Script **không đè** file đang chạy:
tài liệu khung + `.claude/commands` copy thẳng; file gốc (`CLAUDE.md`, `PROJECT.md`…) chỉ copy nếu **chưa có**
(đã có thì để bản `.framework-new` cạnh bên để tự so); file cấu hình/stack đưa vào `_framework-dropins/` để tự merge.

**macOS / Linux (bash):**
```bash
bash copy-framework.sh /đường-dẫn/tới/dự-án
```

**Windows (PowerShell)** — bản `.ps1` hành vi **giống hệt** bản `.sh`:
```powershell
# Windows PowerShell 5.1 có sẵn trên mọi máy Windows — không cần cài gì thêm:
powershell -ExecutionPolicy Bypass -File .\copy-framework.ps1 C:\đường-dẫn\tới\dự-án

# Nếu đã cài PowerShell 7 (lệnh pwsh):
pwsh ./copy-framework.ps1 C:\đường-dẫn\tới\dự-án
```
> **Vì sao có `-ExecutionPolicy Bypass`:** Windows mặc định chặn chạy script `.ps1` chưa ký. Cờ này chỉ nới
> cho đúng lần chạy đó (không đổi cấu hình máy). Nếu muốn nới sẵn cho user hiện tại:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Bước 2 — Merge phần cấu hình
Soát thư mục `_framework-dropins/` trong dự án đích: chỉ merge file **khớp stack hiện có** (đừng đè cấu hình đang
chạy). Xong thì xóa `_framework-dropins/`. Với file `*.framework-new`: so với bản gốc rồi gộp phần cần, sau đó xóa.

### Bước 3 — Mở Claude Code trong dự án đích
AI tự đọc `CLAUDE.md` và chạy **Bước 0** của `docs/framework/existing-project-adoption.md` (tự dò stack qua
`package.json`/config — không cần bạn khai). Từ đó áp khung **tăng dần**: Prettier → ESLint → TS strict → hook →
CI → lấp lỗ hổng test/a11y/hiệu năng. Muốn **hoàn thiện toàn dự án** (hết lỗi đã biết, tính năng thống nhất,
có bằng chứng) → gõ `/completion` (`docs/framework/project-completion.md`).

> *Vì sao phải copy chứ không "đưa link": một phiên Claude Code chỉ tự nạp luật từ chính repo của nó
> (và `~/.claude/CLAUDE.md`), không đọc được repo khác qua link.* Chi tiết brownfield: `docs/framework/existing-project-adoption.md`.

## Việc phải làm tay (không đè được file của create-next-app)
Theo **`docs/framework/new-project-runbook.md` Phần D**: cài gói + thêm khối `scripts` + `npx husky init`;
thêm các cờ TypeScript `strict` vào `tsconfig.json`.

> Sau đó làm tiếp theo runbook: bật branch protection + Code scanning trên GitHub, kết nối Supabase,
> deploy thử Vercel, rồi **kiểm chứng hàng rào** (thử commit sai phải bị chặn) trước khi code tính năng.
> Danh mục đầy đủ việc-dự-án-thật: Phần E của runbook.

## Lưu ý
- ESLint dùng **flat config** (`eslint.config.mjs`) cho ESLint 9/10 + Next 16. Nếu phiên bản Next/ESLint
  của bạn khác, đối chiếu lại cách `eslint-config-next` xuất config (FlatCompat vs flat gốc).
- README này KHÔNG cần commit vào dự án thật — xóa sau khi setup xong nếu muốn.
