# PROJECT.md — Xgold

> Đặc tả dự án — nguồn sự thật về _cái gì cần xây_. Điền đầy đủ trước khi code.
> Mẫu lấy từ docs/framework/KHUNG-2 (Phần B). Nhờ AI phản biện trước khi chốt.
> **Mẫu này mặc định theo hồ sơ Web app.** Các mục đặc thù web (Lighthouse/CWV, RLS, theme, endpoint) **chỉ điền nếu
> đúng hồ sơ**; hồ sơ khác thay bằng tiêu chí tương đương (xem KHUNG-3 PHẦN C).

## 0. Loại dự án & Hồ sơ

- Loại dự án: **Web app** (thành phần thu thập dữ liệu định kỳ chạy dưới dạng dịch vụ nền nhẹ).
- Hồ sơ áp dụng (KHUNG-3 C1–C10): **C1 — Web app** (giao diện chart) + **C4 thu gọn — Backend/dịch vụ** (ingestion, gói trong Supabase Edge Function + pg_cron thay vì service riêng).
- Cổng chất lượng đặc thù của hồ sơ: cổng C1 chuẩn (Lighthouse/CWV, WCAG AA, theme Dark blue+Light, mobile-first) áp cho toàn bộ UI; phần ingestion (C4) thay cổng CWV bằng **idempotency + `ingest_runs` log + retry/backoff** làm tiêu chí chất lượng.

## 1. Vấn đề & Người dùng

- Vấn đề: theo dõi giá vàng (đặc biệt XAU/USD) trên chart kỹ thuật (nến + chỉ báo) với dữ liệu lịch sử lưu trong CSDL riêng — không phụ thuộc nhúng iframe từ nguồn ngoài, làm nền cho phân tích/cảnh báo sau này.
- Người dùng mục tiêu: nhà đầu tư cá nhân quan tâm vàng (khởi điểm là chủ dự án); mở rộng dần.
- Bằng chứng nhu cầu: nhu cầu tự thân của người sáng lập; xác thực thêm khi có người dùng thật dùng MVP.
- Đối thủ & điểm khác biệt: TradingView đã có XAU/USD tốt — Xgold khác ở (a) dữ liệu nằm trong CSDL riêng để tự phân tích/mở rộng, (b) chừa chỗ gộp giá vàng trong nước (SJC/DOJI/BTMC) mà TradingView không có, (c) bộ chỉ báo tùy biến theo ý (Multi-MA, Multi-RSI nhiều đường cùng lúc).

## 2. Phạm vi MVP (MoSCoW)

- **Must have:**
  1. Thu thập & lưu OHLC XAU/USD khung 1h + 1D vào Postgres; backfill lịch sử ≥ 5 năm daily; upsert idempotent; log mỗi lần chạy (`ingest_runs`). _Tiêu chí chấp nhận:_ chạy ingest 2 lần liên tiếp không tạo dữ liệu trùng; `ingest_runs` phản ánh đúng thành công/thất bại.
  2. Chart nến kiểu TradingView (lightweight-charts): zoom/pan, crosshair, chuyển khung 1h/4h/1D/1W (4h & 1W resample từ 1h & 1D). _Tiêu chí:_ mở `/chart/xauusd` thấy nến render đúng thứ tự thời gian; đổi khung không vỡ layout.
  3. **Multi-MA:** nhiều đường trung bình động (SMA và/hoặc EMA), mỗi đường tự chọn loại + chu kỳ + màu, vẽ chồng lên nến (mặc định SMA 20/50/200). _Tiêu chí:_ thêm/xóa/sửa một đường cập nhật chart ngay; giá trị khớp công thức chuẩn (sai số < 1e-6 trong unit test).
  4. **Multi-RSI:** nhiều đường RSI chu kỳ khác nhau trên cùng pane phụ (mặc định RSI 14) + 2 vạch ngưỡng 30/70. _Tiêu chí:_ tương tự Multi-MA; pane RSI tách khỏi pane giá.
  5. Lưu cấu hình chỉ báo (localStorage + URL chia sẻ được) — chưa cần tài khoản. _Tiêu chí:_ reload giữ nguyên cấu hình; dán URL đã chia sẻ khôi phục đúng cấu hình.
  6. Theme Dark blue mặc định + Light, mobile-first, đủ 4 trạng thái (tải/rỗng/lỗi/thành công) trên trang chart.
- **Should have:** giá vàng trong nước (SJC/BTMC/DOJI — bảng mua/bán + line chart) · cập nhật giá gần realtime (polling hoặc Supabase Realtime) · badge "độ tươi dữ liệu" khi nguồn stale.
- **Could have:** thêm symbol (XAG, DXY, USD/VND) · MACD, Bollinger Bands · export CSV · so sánh vàng SJC vs thế giới quy đổi.
- **Won't have (lúc này):** tài khoản/đăng nhập · alert đẩy thông báo · công cụ vẽ lên chart (trendline...) · app mobile riêng · tin tức/phân tích.

## 3. Yêu cầu phi chức năng

- Tốc độ mục tiêu: Lighthouse ≥ 90 (performance/accessibility/best-practices/seo); CWV: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (`lighthouserc.json`).
- Bảo mật: RLS bật trên `candles`/`instruments`/`ingest_runs` (anon chỉ `SELECT`); ghi dữ liệu chỉ qua `service_role` trong Edge Function; khóa API provider (Twelve Data) là secret phía server, không lộ ra client.
- Accessibility: WCAG AA cả hai theme; lint `jsx-a11y` + axe trong E2E; điều khiển chart/panel dùng được bằng bàn phím.
- Mobile-first & thiết bị/trình duyệt hỗ trợ: vùng chạm ≥ 44px; test Playwright cả desktop (Chromium) và mobile (Pixel 5 viewport).
- Theme: nền **Dark blue mặc định** + chế độ **Light** (`styles/theme.css`, đã có sẵn).

## 4. Tech stack

> Điền theo KHUNG 3 (research-first). Xem ma trận đầy đủ + lý do so sánh ở `docs/plans/xgold-mvp-plan.md` và các ADR 0001–0004.

- Frontend/Backend: Next.js 16 (App Router) + React 19, TypeScript `strict` 6.
- CSDL + Auth + Realtime + Edge Functions: Supabase (Postgres).
- Hosting: Vercel (app) + Supabase (data/functions).
- Chart: lightweight-charts (TradingView) — multi-pane cho RSI.
- Validate runtime: Zod.
- Nguồn dữ liệu XAU/USD: Twelve Data (chính) + Stooq (backfill lịch sử daily).
- Ingestion định kỳ: Supabase Edge Function + pg_cron/pg_net (Vercel Cron gói Hobby chỉ chạy 1 lần/ngày, không đủ).
- Test: Vitest (unit) + Playwright + axe (E2E/a11y) + Lighthouse CI (hiệu năng).
- Phiên bản chính (đã xác minh ngày 2026-07-03, npm registry + nodejs.org):
  Node **22.x LTS "Jod"** (khớp `.nvmrc` và Node cài sẵn trong môi trường build) · Next.js **16.2.10** · React **19.2.7** · TypeScript **6.0.3** · Tailwind CSS **4.3.2** · `@supabase/supabase-js` **2.110.0** · `lightweight-charts` **5.2.0** · Zod **4.4.3** · Vitest **4.1.9** · `@playwright/test` **1.61.1**.
  _(Lưu ý: bản tư vấn ban đầu ở `docs/plans/xgold-mvp-plan.md` ghi Node 24.x theo "Active LTS" thời điểm đó; khi bootstrap thực tế đã đối chiếu lại — môi trường build và `.nvmrc` sẵn có của repo dùng Node 22.x LTS, vẫn trong 3 dòng LTS song song hỗ trợ — chốt theo 22.x để khớp thực tế triển khai.)_

## 5. Thiết kế dữ liệu

- `instruments(id uuid pk, symbol text unique, name text, type text, currency text, source_config jsonb, created_at timestamptz)`
- `candles(instrument_id uuid fk, timeframe text, ts timestamptz, open numeric, high numeric, low numeric, close numeric, volume numeric null, source text, PRIMARY KEY(instrument_id, timeframe, ts), CHECK(high >= low))` — giá dùng `numeric` (không float); thời gian UTC (`timestamptz`).
- `ingest_runs(id uuid pk, instrument_id uuid fk, provider text, timeframe text, started_at timestamptz, finished_at timestamptz, status text, rows_upserted int, error text)`
- Chính sách RLS: `anon`/`authenticated` chỉ `SELECT` trên `instruments`/`candles`; không có policy `INSERT/UPDATE/DELETE` cho các role client (chỉ `service_role` ghi được, bỏ qua RLS theo mặc định Supabase).

## 6. Kiến trúc & API

- Sơ đồ luồng: `pg_cron` (Supabase) → `pg_net` → Edge Function `ingest-gold` → gọi Twelve Data/Stooq (Zod validate response) → UPSERT `candles` + ghi `ingest_runs` → Next.js đọc qua Supabase client (anon, read-only) → `GoldChart` (lightweight-charts) render.
- Danh sách endpoint (nội bộ Next.js):
  - `GET /api/candles?symbol=XAUUSD&timeframe=1h|4h|1D|1W` → mảng nến (đọc Supabase nếu có cấu hình env; nếu chưa cấu hình DB, trả dữ liệu mẫu có gắn nhãn rõ nguồn `sample` — không giả là dữ liệu thật). Mã lỗi: `400` (tham số sai, qua Zod), `500` (lỗi đọc CSDL).
  - Supabase Edge Function `ingest-gold` (không phải HTTP endpoint công khai cho client — chỉ `pg_cron`/vận hành gọi).
- Logic nhạy cảm ở server: gọi provider bên ngoài (giữ khóa API), toàn bộ thao tác ghi CSDL (qua `service_role` trong Edge Function, không bao giờ ở client).

## 7. Luồng người dùng chính

1. Vào trang chủ → thấy tiêu đề + mô tả + nút "Xem chart XAU/USD".
2. Vào `/chart/xauusd` → thấy chart nến XAU/USD khung mặc định (1h), có 3 đường MA mặc định (Multi-MA) và pane RSI (Multi-RSI) bên dưới.
3. Đổi khung thời gian (1h/4h/1D/1W) → chart cập nhật, resample đúng.
4. Mở panel chỉ báo → thêm một đường MA mới (chọn SMA/EMA, chu kỳ, màu) → thấy đường mới trên pane giá; thêm một đường RSI mới (chu kỳ khác) → thấy đường mới trên pane RSI.
5. Reload trang hoặc dán lại URL đã chia sẻ → cấu hình chỉ báo giữ nguyên.
6. Chuyển theme Dark blue ↔ Light → chart và toàn bộ UI đổi theo, không mất tương phản.

## 8. Definition of Done (DoD)

- Đạt Báo cáo xác thực CLAUDE.md §7 (build/type/lint/format/test đều ✅) cho mỗi PR.
- Đạt tiêu chí chấp nhận của từng mục Must have ở mục 2.
- E2E (Playwright desktop + mobile) xanh cho luồng chính ở mục 7; axe không có vi phạm nghiêm trọng.
- Lighthouse CI đạt ngưỡng `lighthouserc.json` trên trang chủ và `/chart/xauusd`.
- RLS đã test: client `anon` không ghi được `candles`/`instruments`.
- Không còn dữ liệu mẫu bị nhầm là dữ liệu thật (badge/nhãn rõ ràng khi dùng fixture).

## 9. Lộ trình & Mốc thời gian

- **Đợt 0 — Bootstrap:** khởi tạo Next.js app, hàng rào CI/hook, điền PROJECT.md/CLAUDE.md, ADR 0002–0004. _(đang triển khai)_
- **Đợt 1 — Nền dữ liệu:** migration + RLS, provider adapter (Twelve Data/Stooq), resample, Edge Function `ingest-gold`.
- **Đợt 2 — Chart cơ bản:** trang chart nến + đổi khung + 4 trạng thái UI + theme.
- **Đợt 3 — Chỉ báo:** `lib/indicators` (SMA/EMA/RSI) + Multi-MA overlay + Multi-RSI pane + panel cấu hình.
- **Đợt 4 — Hoàn thiện MVP:** E2E đầy đủ, a11y, Sentry, docs, tối ưu mã nguồn.
- **Đợt 5 (Should, sau MVP):** giá vàng trong nước (SJC/BTMC) + cập nhật gần realtime.

## 10. Rủi ro & Giả định

- **Giả định nguy hiểm nhất:** free tier Twelve Data (800 credits/ngày, 8/phút) đủ cho tần suất thu thập đã thiết kế (~315 credits/ngày ước tính) — _kiểm chứng:_ theo dõi `ingest_runs` sau khi deploy thật, cảnh báo nếu tỉ lệ lỗi tăng do rate-limit.
- Nguồn giá vàng trong nước (SJC/BTMC) có thể đổi cấu trúc bất kỳ lúc nào — cô lập bằng adapter riêng, coi là Should (không chặn MVP).
- Môi trường phát triển hiện tại (sandbox CI/agent) chặn outbound tới các domain dữ liệu tài chính bên ngoài (đã xác minh: Twelve Data, Stooq trả 403 qua proxy) — ingestion thật chỉ kiểm chứng được khi deploy lên Supabase; trong lúc phát triển dùng fixture mẫu có nhãn rõ ràng.
- lightweight-charts v5 (API pane còn tương đối mới) — giảm rủi ro bằng cách viết prototype pane RSI sớm ở Đợt 3 trước khi mở rộng.
