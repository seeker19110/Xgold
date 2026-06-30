# Runbook: Khởi tạo & triển khai một dự án mới

> Tài liệu này chỉ rõ: khi bắt đầu một dự án, **làm gì theo thứ tự** (Phần A) và **phải tuân thủ gì** (Phần B), kết thúc bằng **cổng "sẵn sàng phát triển"** (Phần C).
> Đi từ trên xuống. Không bỏ bước.

---

## Phần 0 — Cấu trúc repo chuẩn (đặt file vào đâu)

```
dự-án/
├─ CLAUDE.md                          ← luật AI (Claude Code tự đọc)
├─ PROJECT.md                         ← đặc tả dự án
├─ PROGRESS.md                        ← trạng thái dự án (cập nhật liên tục)
├─ docs/
│  ├─ framework/                      ← khung chung + hướng dẫn (tham khảo)
│  │  ├─ KHUNG-1-quy-trinh-va-tieu-chuan.md
│  │  ├─ KHUNG-2-luat-AI-va-mau-du-an.md
│  │  ├─ KHUNG-3-chon-cong-nghe-va-de-xuat-chu-dong.md
│  │  ├─ HUONG-DAN-cau-hinh-precommit-CI.md
│  │  ├─ BO-SUNG-chat-luong-Nhom-1.md
│  │  ├─ BO-SUNG-chat-luong-Nhom-2.md
│  │  ├─ BO-SUNG-giao-dien-theme.md
│  │  └─ BO-SUNG-nang-cao-i18n-PWA-Sentry-SEO.md
│  ├─ ops/                            ← vận hành GĐ 8: incident-response + post-mortem (mẫu)
│  └─ adr/                            ← các quyết định kỹ thuật
│     └─ 0000-template.md
├─ LICENSE · SECURITY.md · CONTRIBUTING.md  ← giấy phép + chính sách bảo mật + hướng dẫn đóng góp
├─ eslint.config.mjs                  ← ESLint flat config (Next 16 / ESLint 9-10)
├─ postcss.config.mjs                 ← Tailwind v4
├─ .nvmrc · .editorconfig · .env.example
├─ lib/env.ts                         ← xác thực biến môi trường
├─ styles/theme.css                   ← design tokens (Dark blue + Light)
├─ components/theme-toggle.tsx        ← nút chuyển theme (dùng ngay)
├─ app/                               ← starter: trang lỗi, robots/sitemap, manifest, sw (PWA)
├─ i18n/request.ts · messages/*.json  ← đa ngôn ngữ (next-intl)
├─ e2e/smoke.spec.ts                  ← E2E mẫu (Playwright + axe)
├─ playwright.config.ts               ← cấu hình E2E (desktop + mobile)
├─ lighthouserc.json                  ← ngân sách hiệu năng (Lighthouse CI)
├─ CHANGELOG.md                       ← lịch sử thay đổi
├─ supabase/migrations/               ← migration có phiên bản (mẫu: bảng + ràng buộc + RLS policy)
└─ .github/
   ├─ pull_request_template.md
   ├─ CODEOWNERS                       ← tự gán reviewer (ăn khớp branch protection)
   ├─ ISSUE_TEMPLATE/                  ← mẫu báo lỗi / đề xuất tính năng / sự cố
   ├─ dependabot.yml
   └─ workflows/
      ├─ ci.yml                        ← lint/type/format/test+coverage/build/audit + E2E + chặn [ĐIỀN]
      ├─ lighthouse-ci.yml             ← cổng hiệu năng (Core Web Vitals)
      ├─ codeql.yml                    ← SAST (quét lỗ hổng mã nguồn)
      ├─ secret-scan.yml               ← gitleaks (chặn bí mật lỡ commit)
      └─ release.yml                   ← release-please (CHANGELOG + phiên bản tự động)
```

---

## Phần A — LÀM GÌ (trình tự triển khai)

### Bước 0 — Đưa khung vào repo
- [ ] Copy 4 file khung vào `docs/framework/`.
- [ ] Copy `CLAUDE.md`, `adr-template.md` (→ `docs/adr/0000-template.md`), `lib/env.ts`, `pull_request_template.md` vào đúng chỗ theo Phần 0.

### Bước 1 — Định nghĩa dự án → tạo `PROJECT.md`
*(Tương ứng Giai đoạn 0–2 của khung, làm gọn)*
- [ ] Điền **Mẫu định nghĩa dự án** (Phần B của KHUNG 2): vấn đề, người dùng, MVP (MoSCoW), yêu cầu phi chức năng, stack, schema CSDL, kiến trúc/API, luồng người dùng, DoD, lộ trình, rủi ro.
- [ ] **AI chạy KHUNG 3 (research-first):** đề xuất chủ động *mọi mặt* (PHẦN A) + chọn công nghệ với **phiên bản ổn định đã xác minh bằng nguồn sống** (PHẦN B), cân bằng phổ biến ↔ năng lực; ghi ADR.
- [ ] Chốt `PROJECT.md` sau khi đồng ý các góp ý (tech stack ghi rõ **phiên bản + ngày xác minh**).
- **Tuân thủ:** mỗi tính năng Must có *tiêu chí chấp nhận* đo được; *đóng băng* phạm vi MVP; **không đoán phiên bản theo trí nhớ**.

### Bước 2 — Tạo `CLAUDE.md` cho dự án
- [ ] Điền mọi chỗ `[ĐIỀN: ...]` từ `PROJECT.md`: stack, lệnh (dev/build/test/type-check/format/migration), cấu trúc thư mục, quy ước đặt tên, thư viện chính, giai đoạn hiện tại.
- [ ] Giữ file gọn (< 200 dòng); để chi tiết ở `docs/framework/`.

### Bước 3 — Khởi tạo dự án + Git
- [ ] `npx create-next-app@latest` (TypeScript, Tailwind, ESLint).
- [ ] `git init`, tạo repo trên GitHub, commit đầu tiên.
- [ ] `.gitignore` chặn `.env`, `.env*.local`, `node_modules`, `.next`.
- **Tuân thủ:** không bao giờ commit `.env` hay bí mật.

### Bước 4 — Dựng hàng rào tự động
*(Theo `HUONG-DAN-cau-hinh-precommit-CI.md`, 14 bước)*
- [ ] TypeScript `strict` + các cờ nghiêm (`noUncheckedIndexedAccess`...).
- [ ] ESLint (no-explicit-any, no-floating-promises) + Prettier.
- [ ] ESLint thêm `jsx-a11y/recommended` (a11y tĩnh).
- [ ] Husky + lint-staged → **pre-commit hook** (lint + format + type-check).
- [ ] commitlint → **commit-msg hook** (ép conventional commits).
- [ ] Vitest (`npm test`) + **ngưỡng coverage** (`npm run test:coverage`).
- [ ] **Playwright** E2E (desktop + mobile) + **axe** (`npm run test:e2e`).
- [ ] CI (GitHub Actions): build + lint + type-check + format:check + test+coverage + `npm audit` + **chặn `[ĐIỀN]`**;
      job **E2E Playwright** (desktop + mobile + axe); **Lighthouse CI** trên PR (`lighthouse-ci.yml`).
- [ ] **CodeQL** (SAST) + **gitleaks** (secret scan) — `codeql.yml`, `secret-scan.yml`.
- [ ] **release-please** (`release.yml`) — sinh CHANGELOG + phiên bản tự động từ conventional commits.
- [ ] Dependabot.
- **Tuân thủ:** không bỏ bước nào của hàng rào — đây là tầng chặn lỗi đáng tin cậy nhất.

### Bước 5 — Thêm file bổ sung chất lượng
- [ ] `lib/env.ts`: đổi tên biến cho khớp dự án; dùng `clientEnv`/`serverEnv` thay cho `process.env` rải rác.
- [ ] `styles/theme.css`: nối tokens vào Tailwind + script no-flash + nút chuyển (theo `BO-SUNG-giao-dien-theme.md`). Mặc định **Dark blue**, có **Light**.
- [ ] `e2e/smoke.spec.ts`: sửa cho khớp luồng chính thật.
- [ ] `.github/pull_request_template.md` + `ISSUE_TEMPLATE/` + `CHANGELOG.md` đã ở đúng chỗ.
- [ ] Thư mục `docs/adr/` sẵn sàng (viết ADR khi có quyết định kỹ thuật lớn).

### Bước 6 — Bật branch protection (GitHub UI)
- [ ] Settings → Branches → rule cho `main`: yêu cầu **Pull request**, yêu cầu **status checks (job CI) xanh**, yêu cầu **nhánh cập nhật** trước khi merge.
- **Tuân thủ:** từ đây, không gì vào `main` khi CI chưa xanh.

### Bước 7 — Kết nối Supabase + migration đầu tiên
- [ ] `npx supabase init` → `link` tới project; commit thư mục `supabase/`.
- [ ] Tạo schema qua migration (`supabase migration new ...` hoặc `db diff`).
- [ ] **Bật và test Row Level Security** trước khi mở cho người ngoài.
- [ ] Commit `supabase/migrations/`.
- **Tuân thủ:** mọi thay đổi CSDL đi qua migration có phiên bản; có sẵn đường rollback (migration bù trừ hoặc backup).

### Bước 8 — Deploy thử lên Vercel (Hello World)
- [ ] Kết nối repo với Vercel.
- [ ] Đặt biến môi trường **riêng** cho Production và Preview (Preview trỏ tới Supabase "staging", không đụng dữ liệu thật).
- [ ] Xác nhận build + deploy thành công, và mỗi PR tự sinh một bản Preview.
- **Tuân thủ:** chỉ nhánh `main` deploy lên production.

### Bước 9 — Kiểm chứng hàng rào hoạt động
- [ ] Thử commit message sai chuẩn → **phải bị chặn**.
- [ ] Thử thêm code sai kiểu/thừa biến rồi commit → pre-commit **phải chặn**.
- [ ] Tạo một PR thử → CI chạy; khi đỏ thì **không merge được**.
- Nếu một trong số này không bị chặn → hàng rào chưa hoạt động, quay lại Bước 4/6.

> **Hết Bước 9 = dự án "sẵn sàng phát triển".** Chuyển sang Giai đoạn 4 (Phát triển), mỗi tính năng đi qua cổng commit/merge trong `CLAUDE.md`.

---

## Phần B — PHẢI TUÂN THỦ GÌ (quy tắc bất biến, không bao giờ phá)

### Mã nguồn & kiểu dữ liệu
- TypeScript `strict`, **không `any`**.
- Mọi đầu vào (người dùng, API, CSDL) **validate lúc chạy** trước khi dùng.
- Mọi thao tác có thể fail đều có **xử lý lỗi** + trạng thái tải/rỗng/lỗi trên UI.
- Không lặp logic; hàm nhỏ làm một việc; không "số/chuỗi ma thuật".

### Bảo mật
- **Bí mật không bao giờ vào Git** (dùng biến môi trường).
- Logic nhạy cảm (kiểm tra quyền, tính toán quan trọng) **luôn ở server**.
- Truy vấn **tham số hóa** (chống SQL injection); **escape** dữ liệu ra HTML (chống XSS).
- **RLS** bật và đã test trước khi mở cho người ngoài.

### Git & quy trình
- Mỗi tính năng/sửa lỗi **một nhánh riêng**; commit nhỏ.
- **Conventional commits** (`feat`, `fix`, `refactor`...).
- **Mọi merge qua Pull Request**; **CI xanh mới được merge**; **không push thẳng `main`**.

### Chất lượng
- Một tính năng chỉ **XONG** khi đạt **Definition of Done** (đối chiếu checklist PR).
- Một task chỉ **BẮT ĐẦU** khi đạt **Definition of Ready** (có tiêu chí chấp nhận rõ, không còn câu hỏi mở, phạm vi gói trong một PR).

### Hành vi AI
- **Không bịa** hàm/thư viện/API — xác minh tồn tại.
- **Đọc file thật**, **chạy lệnh thật** — không giả định, không đoán kết quả.
- **Xuất báo cáo xác thực** trước mỗi commit/merge; có mục ❌ thì không commit/merge.
- **Dừng và hỏi** khi mơ hồ / thao tác không hoàn tác được / đụng bảo mật, thanh toán, dữ liệu thật.
- **Chủ động góp ý** khi thấy cách tốt hơn hoặc rủi ro — không im lặng làm theo.

### Dữ liệu & vận hành
- Mọi thay đổi CSDL qua **migration có phiên bản**, có đường **rollback**.
- **Backup đã thử khôi phục** ít nhất một lần.
- **Không test trên dữ liệu production thật**; tách môi trường dev/staging/production.

---

## Phần C — Cổng "Sẵn sàng phát triển" (kiểm trước khi viết code tính năng)

Chỉ bắt đầu phát triển tính năng khi **tất cả** đã đạt:

- [ ] `PROJECT.md` hoàn chỉnh, đã qua phản biện của AI.
- [ ] `CLAUDE.md` đã điền đầy đủ cho dự án (không còn `[ĐIỀN]`).
- [ ] Repo + GitHub + `.gitignore` chặn bí mật.
- [ ] Pre-commit hook + commit-msg hook **đã thử và chặn được** lỗi.
- [ ] CI chạy trên PR; branch protection bật, **không merge được khi đỏ**.
- [ ] `lib/env.ts` hoạt động; biến môi trường đã đặt cho cả Production và Preview.
- [ ] Supabase kết nối, RLS bật, migration đầu đã commit.
- [ ] Deploy thử lên Vercel thành công; Preview tự sinh cho PR.
- [ ] Backup CSDL đã bật.

> Đạt đủ = ba tầng phòng thủ đã sẵn sàng (AI có kỷ luật + hook cục bộ + CI tập trung). Giờ mới bắt đầu code tính năng theo Giai đoạn 4.
EOF
