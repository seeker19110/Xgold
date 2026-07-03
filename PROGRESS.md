# PROGRESS.md — Trạng thái dự án Xgold

> Cập nhật sau mỗi mốc đáng kể. AI đọc file này để biết đang ở đâu.
> (Repo trước đây là khung/template trống; đợt này bootstrap thành dự án Xgold thật —
> nhật ký phát triển khung cũ không còn liên quan, xem lịch sử Git nếu cần tra lại.)

## Giai đoạn hiện tại

- GĐ 4 — Phát triển. Chạy `/auto` theo kế hoạch đã duyệt (`/root/.claude/plans/refactored-frolicking-island.md`),
  triển khai từng đợt qua `/gate`. Xem lộ trình đầy đủ ở `docs/plans/xgold-mvp-plan.md` mục 6 và 9.

## Đã xong

- ✅ **Tư vấn research-first** (`/consult`): kế hoạch MVP đầy đủ ở `docs/plans/xgold-mvp-plan.md` — phân loại
  hồ sơ C1+C4, MVP MoSCoW, ma trận chọn chart lib (lightweight-charts 5.2.0) + nguồn dữ liệu (Twelve Data +
  Stooq), kiến trúc ingestion (Supabase Edge Function + pg_cron). PR #1 (draft).
- ✅ **Chốt kế hoạch qua `/auto`**: người dùng duyệt kế hoạch triển khai (plan mode), thêm yêu cầu **Multi-MA**
  (nhiều đường SMA/EMA trên pane giá, song song Multi-RSI). 6 điểm mục 9 của kế hoạch tư vấn đã chốt.
- ✅ **Đợt 0 — Bootstrap:**
  - `package.json` + cài đặt: Next 16.2.10, React 19.2.7, TypeScript 6.0.3 (strict + `noUncheckedIndexedAccess`),
    Tailwind 4.3.2, `@supabase/supabase-js` 2.110.0, `lightweight-charts` 5.2.0, Zod 4.4.3, Vitest 4.1.9,
    `@playwright/test` 1.61.1 (phiên bản đã xác minh nguồn sống 2026-07-03).
  - `tsconfig.json`, `next.config.ts`, `app/layout.tsx` (+ script no-flash theme), `app/page.tsx`,
    `app/globals.css` (nối `styles/theme.css` vào Tailwind v4 qua `@theme inline`).
  - **Phát hiện & vá 2 lỗi tương thích thật** (chạy thật, không đoán):
    1. ESLint 10.6.0 mới nhất crash khi lint (`eslint-plugin-react` 7.37.5 bundled trong
       `eslint-config-next` gọi API `context.getFilename()` đã bị ESLint 10 gỡ bỏ) → hạ về **ESLint 9.39.4**
       (bản 9.x mới nhất, vẫn trong peer range `>=9.0.0` của `eslint-config-next`).
    2. `npm audit --audit-level=high` sẽ đỏ vì lỗ hổng `tmp`/`inquirer` **chỉ nằm trong devDependency**
       `@lhci/cli` (không lộ ra runtime người dùng) → sửa `ci.yml` dùng `npm audit --omit=dev --audit-level=high`.
  - Sửa 1 lỗi lint thật trong scaffold kế thừa: `components/theme-toggle.tsx` vi phạm rule mới
    `react-hooks/set-state-in-effect`; giữ nguyên pattern an toàn cho SSR/hydration (đọc localStorage sau
    mount), thêm `eslint-disable-next-line` có chú thích lý do + viết unit test bảo vệ hành vi
    (`components/theme-toggle.test.tsx`, 3 test).
  - Hoãn i18n (next-intl) và PWA (Serwist) — scaffold sẵn (`i18n/`, `app/sw.ts`) nhưng ngoài phạm vi MVP; loại
    khỏi `tsconfig.json`/`eslint.config.mjs` để không chặn cổng, giữ file lại cho khi thật sự áp dụng.
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (3/3) · `build` ✅.
  - Điền đầy đủ `PROJECT.md` (mục 0–10) và `CLAUDE.md` mục 10 (hết `[ĐIỀN]`).
  - **ADR mới:** `0002-chart-library.md` (lightweight-charts), `0003-gold-price-data-sources.md`
    (Twelve Data + Stooq, adapter pattern), `0004-time-series-storage-postgres.md` (Postgres thuần, không
    TimescaleDB — đã deprecated trên Supabase PG17).
  - **Xác minh ràng buộc môi trường quan trọng:** sandbox hiện tại **chặn outbound** tới Twelve Data/Stooq/
    SJC/BTMC (403 qua agent proxy) — npm registry/nodejs.org vẫn truy cập được. → thiết kế ingestion tách
    fetch (deploy-time) khỏi hiển thị (fixture-time, Đợt 1–2).

## Đang làm

- Chuẩn bị Đợt 1 — Nền dữ liệu: migration `candles`/`instruments`/`ingest_runs` + RLS, adapter
  `lib/providers/` (Twelve Data + Stooq, Zod validate, unit test bằng fixture), `lib/candles/resample.ts`,
  Edge Function `ingest-gold`.

## Tiếp theo

- Đợt 1 → Đợt 2 (chart cơ bản) → Đợt 3 (Multi-MA + Multi-RSI, trọng tâm yêu cầu) → Đợt 4 (hoàn thiện MVP).
  Chi tiết từng đợt: `docs/plans/xgold-mvp-plan.md` mục 6, kế hoạch thực thi đầy đủ ở
  `/root/.claude/plans/refactored-frolicking-island.md`.
- Commit + mở PR cho Đợt 0 lên nhánh `claude/financial-data-trading-indicators-cwbvf6` (PR #1 hiện có),
  theo dõi CI, merge khi xanh (CLAUDE.md §8).

## Quyết định quan trọng (trỏ tới ADR nếu có)

- Chart: lightweight-charts 5.2.0 (ADR-0002). Nguồn dữ liệu: Twelve Data + Stooq, adapter pattern (ADR-0003).
  CSDL time-series: Postgres thuần, không TimescaleDB (ADR-0004). Stack nền: ADR-0001 (đã có từ khung).
- Node runtime: **22.x LTS "Jod"** (không phải 24.x như bản tư vấn ban đầu) — khớp `.nvmrc` sẵn có của repo
  và môi trường build thực tế; đã ghi rõ lý do đối chiếu lại trong `PROJECT.md` mục 4.
- ESLint ghim ở **9.39.4** (không dùng bản 10.x mới nhất) do lỗi tương thích thật với
  `eslint-plugin-react` bundled trong `eslint-config-next` — xem "Đã xong" ở trên.
- i18n/PWA hoãn tới khi thật sự áp dụng (ngoài phạm vi MVP đã duyệt).

## Nợ kỹ thuật (chỗ "làm tạm" cần quay lại)

- `app/manifest.ts` tham chiếu icon `/icon-192.png`, `/icon-512.png` chưa có file thật — không chặn cổng
  (không phải lỗi build/lint), nhưng cần bổ sung ảnh icon thật trước khi PWA/manifest được dùng nghiêm túc.
- Ingestion thật (gọi Twelve Data/Stooq) chưa kiểm chứng được trong sandbox (mạng bị chặn) — chỉ kiểm bằng
  fixture + unit test; xác minh thật khi deploy lên Supabase (cần `TWELVEDATA_API_KEY`).

## Bàn giao phiên (điền khi WIND-DOWN gần chạm limit 5h — để phiên sau "tiếp tục")

- (chưa cần — phiên đang trong Đợt 0, chưa tới ngưỡng wind-down)
