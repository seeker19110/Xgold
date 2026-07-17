# PROGRESS.md — Trạng thái dự án Xgold

> Cập nhật sau mỗi mốc đáng kể. AI đọc file này để biết đang ở đâu.
> (Repo trước đây là khung/template trống; đợt này bootstrap thành dự án Xgold thật —
> nhật ký phát triển khung cũ không còn liên quan, xem lịch sử Git nếu cần tra lại.)

## Giai đoạn hiện tại

- GĐ 4 — Phát triển. MVP Đợt 0–4 + Đợt 5 (vàng trong nước) + Đợt 6–8 (MACD/Bollinger + engine phân
  tích gợi ý mua/bán) + Đợt 9 (đa symbol: XAU/USD + XAG/USD + DXY + USD/VND, ADR-0008/0009) +
  **Đợt 10 (bề mặt phân tích: MTF confluence + Screener + Ratio/Correlation, ADR-0010)** +
  **Đợt 11 (mây Ichimoku R6 + xếp chồng RSI R7 + Entry/SL/TP/Xác suất/Rủi ro, ADR-0011 — LẬT LẠI
  ranh giới "không entry/SL/TP" của ADR-0007/0010 theo yêu cầu người dùng)** +
  **Đợt 12 (dải khung thời gian đầy đủ kiểu TradingView: 5m/15m/30m/1h/4h/1D/1W/1M)** đã xong. Còn lại là
  việc chỉ làm được ngoài sandbox này (deploy Supabase thật, kiểm chứng ingestion) — xem "Tiếp
  theo". Xem lộ trình đầy đủ ở `docs/plans/xgold-mvp-plan.md` mục 6 và 9,
  `docs/plans/xgold-development-plan.md`, `docs/plans/xgold-analysis-surface-plan.md`.

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

- ✅ **Sửa 2 lỗi CI thật phát hiện trên PR #1** (job `quality` + `docs-consistency`): dòng hướng dẫn
  đầu `CLAUDE.md` chứa literal `[ĐIỀN: ...]` làm ví dụ, bị chính cổng quét placeholder hiểu nhầm — diễn
  đạt lại không dùng chuỗi khớp mẫu; `PROGRESS.md`/`docs/plans/xgold-mvp-plan.md` từng trỏ tới đường dẫn
  plan-mode cục bộ (`/root/.claude/plans/...`, chỉ tồn tại trong sandbox phiên bootstrap) — thay bằng mô
  tả không phụ thuộc đường dẫn ngoài repo.
  - **Ghi nhận (không tự sửa được):** job CodeQL đỏ vì "Code scanning is not enabled for this
    repository" — đây là **cài đặt GitHub repo** (Settings → Code security and analysis → Code
    scanning), không phải lỗi code; cần chủ repo tự bật.
- ✅ **Đợt 1 — Nền dữ liệu:**
  - Migration `supabase/migrations/20260703083820_xgold_schema.sql`: bảng `instruments`/`candles`
    (khóa chính `(instrument_id, timeframe, ts)`, CHECK high/low/open/close, `numeric`)/`ingest_runs`;
    RLS bật + policy đọc công khai cho `anon`/`authenticated`, không policy ghi (chỉ `service_role`);
    seed instrument XAU/USD. Xóa migration mẫu `tasks` (không còn liên quan).
  - **Xác minh migration THẬT** bằng Postgres 16 cài sẵn trong sandbox (không có Docker nên không
    dùng được `supabase db reset`, nhưng có `psql` — khởi động cluster, tạo DB thử, stub 3 role
    `anon`/`authenticated`/`service_role`, áp migration, rồi test tay: CHECK constraint chặn đúng
    high<low; upsert đúng khóa chính giữ nguyên 1 dòng (idempotent); `anon` đọc được nhưng **không**
    ghi được (RLS + GRANT đúng như thiết kế). **Phát hiện 1 lỗi thật:** RLS chỉ lọc hàng, không tự cấp
    quyền — thiếu `GRANT SELECT` tường minh thì `anon` bị "permission denied" dù có policy SELECT; đã
    thêm `grant usage on schema public` + `grant select on instruments, candles to anon, authenticated`
    vào migration (không dựa vào default privileges ngầm định của Supabase). Dọn DB/role thử sau khi
    xong.
  - `lib/candles/types.ts` (Candle + Timeframe dùng chung), `lib/candles/resample.ts` (1h→4h, 1D→1W,
    tính lúc đọc — không lưu lại; 4h theo khối UTC, 1W theo tuần ISO bắt đầu Thứ Hai) + 5 unit test
    (ranh giới giờ/tuần bằng dữ liệu mẫu cố định, đã tính tay ngày trong tuần trước khi viết test).
  - `lib/providers/` (adapter pattern): `TwelveDataProvider` + `StooqProvider`, Zod validate response,
    `ProviderError` có ngữ cảnh; 13 unit test (mock `fetch` qua fixture, gồm ca lỗi: response sai định
    dạng, symbol không hỗ trợ, HTTP lỗi, OHLC vi phạm ràng buộc, "N/D" của Stooq).
  - `lib/fixtures/xauusd.ts`: dữ liệu MẪU (random walk seed cố định, gắn nhãn rõ `SAMPLE_` — không
    phải giá thật) cho dev/demo trước khi có DB thật; test xác nhận mọi nến hợp lệ theo `CandleSchema`.
  - `lib/supabase/database.types.ts`: kiểu `Database` viết tay khớp migration. **Phát hiện 1 lỗi
    tương thích thật:** thiếu trường bắt buộc `Relationships`/`Views`/`Functions` theo kiểu
    `GenericSchema` của `@supabase/postgrest-js` khiến mọi bảng ngầm suy luận thành kiểu `never`
    (lỗi rất khó đọc) — xác nhận nguyên nhân bằng cách đọc thẳng `.d.mts` của gói đã cài, không đoán.
  - `scripts/backfill.ts` (chạy tay qua `npm run backfill`, dùng `tsx`): backfill Stooq (`1D`, toàn bộ
    lịch sử) + Twelve Data (`1h`, tối đa 5.000 nến), tái dùng adapter đã test, ghi `ingest_runs`. Dry-run
    xác nhận import/path alias `@/*` resolve đúng qua `tsx`; dừng đúng chỗ khi thiếu biến môi trường.
  - `supabase/functions/ingest-gold/index.ts` (Deno, tự chứa — không import được path alias Next.js):
    thu thập nến mới nhất (1h: 10 nến, 1D: 2 nến) theo lịch pg_cron, upsert idempotent, ghi `ingest_runs`.
    **CHƯA kiểm chứng được** (không có Deno/Docker trong sandbox, mạng chặn Twelve Data) — kèm README
    hướng dẫn deploy + test thật + bật `pg_cron` (bắt buộc chạy thử 1 lần trước khi bật lịch).
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (28/28, 5 file) ·
    `build` ✅.

- ✅ **Đợt 2 — Chart cơ bản:**
  - `lib/env.ts`: nới `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` thành OPTIONAL
    (quyết định thiết kế: app chạy được ở chế độ "chưa cấu hình Supabase" bằng dữ liệu mẫu — nơi thật
    sự cần Supabase tự kiểm tra `null`, xem `lib/supabase/client.ts`). **Phát hiện 1 lỗi build thật:**
    ban đầu chỉ nới biến CLIENT, quên biến SERVER — `next build` chết ngay ở bước "Collecting page
    data" vì `lib/env.ts` validate `serverEnv` NGAY khi import module (kể cả từ route chỉ cần
    `clientEnv`), đã sửa.
  - `app/api/candles/route.ts`: đọc Supabase (anon key, RLS cho phép) nếu có cấu hình; else dùng
    `lib/fixtures/xauusd.ts`; luôn trả `source: 'supabase' | 'sample'` để UI gắn nhãn đúng; Zod
    validate query param `symbol`/`timeframe`.
  - `components/chart/`: `gold-chart.tsx` (lightweight-charts v5, nến + đồng bộ màu theo
    Dark blue/Light qua `MutationObserver` trên `data-theme`), `timeframe-switcher.tsx`,
    `use-candles.ts` (hook fetch + hủy kết quả cũ khi đổi tham số). `app/chart/xauusd/`: trang chart
    với 4 trạng thái UI (tải/rỗng/lỗi/thành công) + banner "dữ liệu mẫu" khi chưa có Supabase.
  - **Kiểm chứng THẬT bằng trình duyệt** (Playwright headless thật, không chỉ đọc code): chụp màn
    hình chart hiển thị nến đúng ở cả Dark blue và Light, đổi khung 1h→4h cập nhật đúng số nến
    (336 nến 1h → 84 nến 4h khớp phép chia 4), test qua mobile viewport (375px) responsive tốt.
  - **Chạy axe thật, phát hiện & vá 2 lỗi a11y thật:** (1) banner "dữ liệu mẫu" `text-warning` trên
    `bg-warning/10` chỉ đạt contrast 4.15:1 (cần ≥4.5:1) — đổi sang `text-foreground` + viền
    `border-warning/40` (giữ ý nghĩa cảnh báo bằng viền, chữ đủ tương phản); (2) `role="img"` trên
    container chart vi phạm `nested-interactive` vì lightweight-charts tự thêm phần tử con focus
    được (điều hướng bàn phím) — đổi sang `role="group"`. Xác nhận lại: axe 0 vi phạm ở cả 2 theme.
  - `e2e/chart.spec.ts` (3 test: hiển thị chart, đổi khung, axe) — **chạy thật** bằng Chromium cài sẵn
    trong sandbox (`/opt/pw-browsers`, cấu hình tạm cục bộ do version browser khác bản
    `@playwright/test` cài — không đổi `playwright.config.ts` gốc), cả desktop lẫn mobile project:
    10/10 test xanh.
  - **Chạy Lighthouse thật** (không chỉ tin cấu hình) — vá 2 giới hạn môi trường cục bộ (Chrome cần
    `--no-sandbox` khi chạy root; thiếu `CHROME_PATH`), riêng bước upload lên
    `temporary-public-storage` thất bại vì mạng sandbox chặn (không ảnh hưởng kết quả assertion).
    Kết quả thật cả trang chủ lẫn `/chart/xauusd`: performance 1.0, accessibility 1.0, seo 1.0,
    best-practices 0.96, LCP ~614–661ms, CLS 0 — vượt xa ngưỡng `lighthouserc.json`.
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (28/28) · `build` ✅.

- ✅ **Sửa 1 lỗi CI thật khác phát hiện trên PR #1** (job `e2e` + `lighthouse`): `next build` chết ở
  "Collecting page data" vì `ci.yml` đặt `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` qua
  `${{ secrets.X }}` — khi secret CHƯA cấu hình, GitHub Actions nội suy ra **chuỗi rỗng `""`**,
  không phải unset; Zod `.optional()` chỉ chấp nhận `undefined`, không chấp nhận `""`. Thêm
  `z.preprocess` coi `""` như `undefined` cho mọi biến Supabase optional (client + server). Tái
  hiện lỗi cục bộ bằng `NEXT_PUBLIC_SUPABASE_URL="" npm run build` trước khi sửa, xác nhận xanh
  sau khi sửa — không đoán.

- ✅ **Đợt 3 — Indicators (trọng tâm yêu cầu ban đầu):**
  - `lib/indicators/`: `sma.ts`, `ema.ts` (seed bằng SMA, khớp TradingView), `rsi.ts` (Wilder
    smoothing/RMA — không phải trung bình cộng đơn giản). 23 unit test, **giá trị tính TAY** (không
    chỉ chạy code rồi dán kết quả): SMA(3)/EMA(3) trên chuỗi tuyến tính [1..5] (chứng minh bằng toán
    học lý do 2 kết quả trùng nhau — cùng "lag" (period-1)/2); EMA(2) trên [10,20,10,20,10] bằng phân
    số chính xác (35/3, 155/9, 335/27); RSI(2) trên [44,44.25,44.5,43.75] tính tay Wilder từng bước
    ra [null,null,100,25]; ca biên toàn tăng→100, toàn giảm→0, đứng yên→50 (quy ước), ngắn hơn chu
    kỳ→toàn null.
  - `lib/indicators/config.ts`: `ChartConfig` (Multi-MA + Multi-RSI) với Zod schema, mã hóa
    base64+URI cho URL query `?cfg=`, giải mã có validate (chuỗi hỏng/bị sửa tay → `null`, không
    crash trang) — 5 unit test gồm round-trip qua `URLSearchParams` thật.
  - `components/chart/use-indicator-config.ts`: state cấu hình bắt đầu bằng default (khớp SSR),
    đọc URL/localStorage THẬT sau mount (tránh lệch hydrate — cùng pattern đã dùng ở
    `theme-toggle`/`use-candles`), rồi tự đồng bộ lại cả hai mỗi khi đổi.
  - `components/chart/indicator-panel.tsx`: UI thêm/xóa/sửa (loại SMA|EMA, chu kỳ, màu, ẩn/hiện)
    cho từng đường MA và RSI riêng, đủ nhãn `aria-label`/`sr-only`, vùng chạm ≥44px.
  - `components/chart/gold-chart.tsx`: mở rộng — Multi-MA vẽ chồng lên pane giá (pane 0); Multi-RSI
    ở pane phụ (pane 1, tự tạo/tự xóa theo `chart.addSeries(LineSeries, opts, 1)`) kèm 2 vạch ngưỡng
    30/70 nét đứt; đồng bộ thêm/xóa/đổi màu từng đường theo cấu hình, không tạo lại toàn bộ chart.
  - **Kiểm chứng THẬT bằng trình duyệt** (không chỉ đọc code): chụp màn hình xác nhận Multi-MA
    (3 đường mặc định + 1 đường thêm mới, đổi màu theo từng đường) và Multi-RSI (pane riêng, 2 đường)
    vẽ đúng, thời gian thực khi bấm nút trong panel; test round-trip URL chia sẻ (mở tab mới bằng URL
    có `cfg=`, cấu hình khôi phục đúng số đường); axe 0 vi phạm trên toàn trang gồm panel.
  - `e2e/indicators.spec.ts` (5 test: mặc định 3 MA+1 RSI, thêm/xóa MA, thêm RSI, URL chia sẻ giữ
    cấu hình, axe) — chạy thật, 20/20 test xanh (chart.spec + indicators.spec + smoke.spec, cả
    desktop lẫn mobile).
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (51/51, 9 file) ·
    `build` ✅.

- ✅ **Đợt 4 — Hoàn thiện MVP:**
  - **README.md viết lại hoàn toàn** — trước đó vẫn 100% nội dung mô tả bộ khung template ("Bộ khung
    phát triển dự án (drop-in)"), không nhắc gì đến Xgold. Giờ mô tả đúng sản phẩm: tính năng, stack,
    cách chạy, cấu trúc thư mục, lệnh hay dùng.
  - **Phát hiện & vá 1 lỗi UX thật:** `ThemeToggle` chỉ có ở trang chủ, KHÔNG có trên `/chart/xauusd`
    — người dùng không đổi được theme khi đang xem chart (phải rời trang), trái với luồng chính đã
    cam kết ở `PROJECT.md` mục 7 bước 6. Thêm `ThemeToggle` + link "← Xgold" về trang chủ vào header
    trang chart.
  - `e2e/chart.spec.ts` thêm 1 test: chuyển theme ngay trên trang chart, xác nhận `data-theme` đổi,
    nhãn nút đổi, chart không vỡ (canvas vẫn còn) — chạy thật, xanh.
  - Rà tối ưu mã nguồn: gỡ 1 chỗ dead code (`lib/indicators/config.ts` re-export `MaLine`/`RsiLine`
    không ai dùng — xác nhận bằng grep toàn repo trước khi xóa). `npm run test:coverage`: 95.34%
    statements / 100% functions / 96.56% lines trên các module có unit test — vượt xa ngưỡng sàn 70%.
  - **Sentry hoãn sang backlog** (không cắm mù): cần DSN thật từ tài khoản Sentry để cấu hình +
    kiểm chứng — cài `@sentry/nextjs` mà không có DSN để test thì không xác nhận được gì, đi ngược
    nguyên tắc chống ảo giác. Ghi vào "Nợ kỹ thuật" bên dưới.
  - 22/22 E2E xanh (chart 4 + indicators 5 + smoke 2, × 2 project desktop/mobile). 5 cổng local đều
    đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (51/51) · `build` ✅.

- ✅ **Đợt 5 — Domestic gold (Should, sau MVP):**
  - **Schema & Migration:** bảng `domestic_gold_prices(vendor, product, buy, sell, ts, source, created_at, PRIMARY KEY(vendor, product, ts))` + `domestic_gold_ingest_runs` (tương tự XAU/USD pattern). RLS SELECT-only cho anon/authenticated. CHECK (sell >= buy). Xác minh trên Postgres 16 thật.
  - **Adapter BTMC:** XML parser (extracting `n_1`/`pb_1`/`ps_1`/`d_1` từ response), VN datetime UTC+7→UTC conversion ("03/07/2026 08:00" → "2026-07-03T01:00:00Z"), parse-defensive (skip malformed rows, throw chỉ nếu ALL rows lỗi). 8 unit test (success, timezone boundary, skip invalid, constraint, HTTP error).
  - **Edge Function:** `supabase/functions/ingest-domestic-gold/index.ts` (Deno, tự chứa, independent implementation từ Next.js adapter để tránh path alias), README.md với 4-step deployment + **bắt buộc test curl + FIELD VERIFICATION** (XML format chưa xác nhận bằng response thật per ADR-0005).
  - **API Route:** `app/api/domestic-gold/route.ts` (Supabase fallback mẫu, trả source rõ ràng).
  - **Freshness Lib:** `lib/domestic-gold/freshness.ts` (30-min stale threshold = 2× 15-min pg_cron).
  - **UI Components:** freshness-badge (● fresh / ▲ stale / ? unknown), price-table (tabular-nums, VND formatting), 4 UI states.
  - **Page:** `app/gia-vang-trong-nuoc/page.tsx` (server) + `page-client.tsx` (client, 60s polling). Link từ trang chủ.
  - **ADR-0005:** Định lựa chọn BTMC primary (XML), vang.today postponed (JSON schema không xác minh được từ authoritative source). Rủi ro cao được ghi rõ ràng.
  - **E2E:** `e2e/domestic-gold.spec.ts` (5 test: hiển thị/buy≤sell/axe/theme toggle/nav từ home) — **chạy thật**, 10/10 xanh (desktop × 2 + mobile × 2 mỗi test).
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (32/32) · `build` ✅.

- ✅ **Backlog: vang.today làm nguồn dự phòng domestic-gold (2026-07-04):**
  - **Xác minh thật** (khác ADR-0005, lúc đó `WebFetch` bị chặn 403 tới domain tài chính): `WebFetch`
    trực tiếp `GET https://www.vang.today/api/prices` phiên này gọi được — nhận JSON sống thật
    (không cần key), 12 mã sản phẩm với `name`/`buy`/`sell`/`currency`. Ghi lại đầy đủ ở **ADR-0006**.
  - **`VangTodayProvider`** (`lib/providers-domestic/vang-today.ts` + test, 9 test) — dùng làm nguồn
    **dự phòng** khi `BtmcProvider` lỗi, KHÔNG thay BTMC. Whitelist tường minh 11 mã → vendor
    (`sjc`/`doji`/`pnj`/`vietinbank`/`vn-gold`/`bao-tin`), loại `XAUUSD` (khác đơn vị tiền, đã có
    nguồn riêng ADR-0003), KHÔNG suy đoán vendor từ chuỗi `name` — mã lạ bị bỏ qua (parse phòng thủ,
    cùng pattern BTMC). `ts` dùng `timestamp` (Unix epoch giây) của response, không parse chuỗi
    ngày/giờ (tránh mơ hồ múi giờ).
  - **Edge Function `ingest-domestic-gold`** cập nhật: thử BTMC trước, tự động fallback sang
    vang.today nếu BTMC lỗi (mạng/parse), ghi rõ `provider` đã dùng vào response +
    `domestic_gold_ingest_runs`. README cập nhật bước đối chiếu field cho cả 2 nguồn + cách test
    nhánh fallback (đổi tạm `BTMC_API_KEY` sai).
  - **Sửa 1 chỗ UI có thể sai lệch:** `app/gia-vang-trong-nuoc/page-client.tsx` trước đó hard-code
    "Nguồn: Bảo Tín Minh Châu (BTMC)" bất kể dữ liệu thật đến từ đâu — giờ đọc `source` THẬT của từng
    dòng giá (đã có sẵn trong response, xem `app/api/domestic-gold/route.ts`), hiển thị đúng nguồn
    (BTMC / vang.today dự phòng / dữ liệu mẫu).
  - **SJC vẫn hoãn — xác nhận bằng bằng chứng mạnh hơn ADR-0005:** gọi trực tiếp cả
    `sjc.com.vn/xml/tygiavang.xml` và `giavang/textContent.php` (có/không `www`) đều trả `403` sống
    (không phải sandbox chặn — WebFetch gọi vang.today cùng phiên thành công). Xác nhận SJC chủ động
    chặn truy cập ngoài trình duyệt, không phải "chưa tìm được endpoint" như ADR-0005 ghi — giữ
    nguyên quyết định hoãn, lý do giờ chắc chắn hơn.
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (105/105, 20 file)
    · `build` ✅. 32/32 E2E vẫn xanh (không phá gì, kể cả sau khi sửa UI label).

- ✅ **Đợt 6–8 — Indicator kết hợp phân tích + gợi ý mua/bán (2026-07-04, người dùng chốt "theo
  đề xuất" trên kế hoạch `docs/plans/xgold-development-plan.md`, ADR-0007):**
  - **Đợt 6:** `lib/indicators/macd.ts` (EMA12−EMA26, signal EMA9 seed SMA — khớp TradingView) +
    `bollinger.ts` (SMA20 ± 2σ population, σ=0 không lỗi chia); 12 unit test **giá trị tính tay**
    (MACD(2,3,2) trên [10,20,10,20,10] bằng phân số chính xác −5/3, 5/9, −25/27, signal −65/81,
    histogram −10/81; BB(3,2) σ=√(2/3)). `ChartConfig` mở rộng `macd`/`bollinger`/`analysis` với
    `.default()` — **tương thích ngược URL/localStorage cũ** (có test). Chart: BB overlay pane 0,
    MACD pane phụ (tự dời pane khi thêm/bỏ RSI — v5 không có API dời series, gỡ + tạo lại).
  - **Đợt 7:** engine `lib/analysis/` — 5 quy tắc R1–R5 (ma-cross, price-vs-ma, rsi-zone,
    macd-cross, bb-touch), mỗi quy tắc pure function nhận `AnalysisParams` (chu kỳ tách tham số để
    test tay bằng chu kỳ nhỏ); `combine.ts` tổng hợp trọng số (thiếu dữ liệu → trung tính đóng góp
    0, |score| chỉ giảm — không đoán); `signalEvents` chỉ dùng nến ≤ index (không nhìn tương lai).
    UI `analysis-panel.tsx`: gợi ý Mua/Bán/Trung lập + điểm + lý do từng quy tắc + bật/tắt +
    trọng số + **disclaimer bắt buộc**; markers ▲Mua/▼Bán trên nến (`createSeriesMarkers` v5 —
    xác nhận API trong bản 5.2.0 đã cài). 32 unit test tính tay cho rules/combine.
  - **Đợt 8:** `lib/analysis/backtest.ts` (thống kê MÔ TẢ: đếm sự kiện theo năm UTC, không đo
    lợi nhuận) + `npm run signal-stats` — chạy thật trên fixture: daily 5 Mua/6 Bán trên 180 nến,
    1h 10 Mua/15 Bán trên 336 nến (tần suất hợp lý, không nhiễu).
  - **Kiểm chứng THẬT bằng trình duyệt:** screenshot cả Dark blue + Light — nến + BB + markers
    Mua/Bán + pane RSI + pane MACD (line/signal/histogram) + khối gợi ý khớp số trên chart (giá
    3191.79 dưới SMA200 3203.69 → ▼ đúng). **Phát hiện 1 vấn đề môi trường (không phải bug code):**
    headless_shell sandbox có locale `en-US@posix` không hợp lệ làm `Intl` của lightweight-charts
    ném RangeError → canvas trống; đặt `locale: 'vi-VN'` trong context Playwright là vẽ đúng —
    E2E/CI không ảnh hưởng. Môi trường E2E sandbox: browser rev 1228 thiếu, symlink sang 1194 sẵn
    có (`/opt/pw-browsers`, shim `chrome-headless-shell-linux64`) — không đổi config repo.
  - **Lighthouse thật cả 3 trang:** performance 1.0, a11y 1.0, CLS 0.000 (không tái phát F-010 dù
    trang chart cao thêm), LCP ≤ 715ms. E2E 44/44 xanh (desktop+mobile; 5 test analysis mới + test
    MACD/BB pane). Coverage 88.5%/76.34%/81.03%/90.46% — vượt sàn 70%. 5 cổng local đều đạt.

- ✅ **Đợt 9 — Đa symbol (2026-07-04, người dùng chốt "làm toàn bộ" bước tiếp theo, ADR-0008):**
  - **Registry mã** `lib/instruments.ts` — nguồn sự thật đa symbol (symbol/slug/label/name/chartLabel/
    type/currency/sample). Thêm **XAG/USD (bạc)** làm mã thứ hai. Toàn bộ `lib/indicators/` + engine
    `lib/analysis/` + `resample` **giữ nguyên** (vốn symbol-agnostic — nhận `Candle[]`).
  - **Route động** `app/chart/[symbol]/` thay route tĩnh `xauusd` (`dynamicParams=false` +
    `generateStaticParams` từ registry → slug hợp lệ prerender SSG, slug lạ **404 do framework**).
    `/chart/xauusd` giữ nguyên hoạt động → **mọi E2E cũ không đổi**. `SymbolSwitcher` điều hướng giữa
    mã (Link, aria-current), trang chủ + sitemap liệt kê mã từ registry. `GoldChart` nhận prop `label`
    (aria-label theo mã, hết hard-code "XAU/USD").
  - **Fixtures:** tách generator dùng chung `lib/fixtures/generate.ts` (`makeSampleSet`), giữ nguyên
    export/giá trị mẫu XAU/USD (seed 1/2, giá 3300/3350 — test cũ không đổi), thêm `xagusd.ts` (bạc
    ~40 USD/oz, seed 3/4). API `/api/candles` đọc mẫu theo registry, validate symbol → **404 mã lạ**
    ở cả nhánh Supabase lẫn mẫu.
  - **Provider:** `SYMBOL_MAP` thêm XAG/USD (Twelve Data `XAG/USD`, Stooq `xagusd`) + test. Ingestion
    đa mã: `backfill.ts` lặp theo registry; Edge Function `ingest-gold` lặp mảng `INSTRUMENTS` nội
    tuyến (đồng bộ thủ công registry ↔ Deno — ghi rõ ở README); migration seed mới
    `20260704090000_add_xagusd_instrument.sql` (idempotent, không sửa migration cũ). **XAG/USD
    ingestion thật vẫn thuộc nợ FT-09/10** (mạng sandbox chặn) — như XAU/USD.
  - **Kiểm chứng THẬT bằng trình duyệt:** screenshot `/chart/xagusd` cả Dark blue + Light — nến bạc
    dải giá ~41–45, SMA 20/50/200, markers Mua/Bán, pane RSI, khối gợi ý **khớp số bạc** (giá 42.82
    dưới SMA200 43.52 → thiên giảm; RSI 17.9 < 30 quá bán; chạm băng BB dưới). SymbolSwitcher đúng
    trạng thái active. API thật: `?symbol=XAGUSD` trả nến mẫu ~40, `?symbol=NOPE` → 404.
  - **E2E** `e2e/multi-symbol.spec.ts` (4 test: render bạc, chuyển mã XAU→XAG, 404 mã lạ, axe) —
    chạy thật **52/52 xanh** (desktop+mobile, gồm 44 test cũ không phá). 5 cổng local đều đạt:
    `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (170/170, 28 file) · `build` ✅. Coverage
    89.5%/77.33%/82.78%/91.37% — vượt sàn 70%.
  - Môi trường E2E sandbox (không đổi config repo): symlink browser rev 1228→1194 + shim
    `chrome-headless-shell-linux64`; config Playwright tạm cục bộ đặt `locale: 'vi-VN'` (tránh Intl
    RangeError của lightweight-charts trong headless_shell) — đã xoá trước khi commit.

## Đã xong (tiếp)

- ✅ **Thêm mã DXY + USD/VND (2026-07-05, người dùng chọn hạng mục backlog "Thêm mã DXY/USD-VND",
  ADR-0009):**
  - `lib/instruments.ts`: mở rộng `Instrument.type`/`currency`, thêm 2 mục registry (DXY: index/USD
    quy ước; USDVND: forex/VND) dùng chung toàn bộ hạ tầng đa symbol từ Đợt 9 (route động, sitemap,
    trang chủ, API `/api/candles`) — không đổi kiến trúc.
  - `lib/fixtures/dxy.ts` (seed 5/6, giá quanh 100 điểm), `lib/fixtures/usdvnd.ts` (seed 7/8, giá
    quanh 26.300 VND) — cùng generator dùng chung `makeSampleSet`.
  - **Nghiên cứu mã provider có kỷ luật** (mạng sandbox vẫn chặn trực tiếp `api.twelvedata.com` +
    `stooq.com`, dùng `WebSearch` tra cứu gián tiếp): Twelve Data thêm `DXY`/`USD/VND` vào
    `SYMBOL_MAP` (độ tin cậy vừa phải, gắn nhãn CHƯA xác nhận + bắt buộc field-verification kỹ hơn
    trước khi bật `pg_cron`) — nhưng **chủ động KHÔNG đoán ticker Stooq** vì tìm thấy 2 khả năng khác
    nhau cho DXY (`dx.f` hợp đồng tương lai vs `usd_i` chỉ số) và không có bằng chứng cho USD/VND;
    đoán sai ở Stooq rủi ro cao hơn Twelve Data vì có thể âm thầm lấy nhầm loại tài sản (không bị
    Zod/test bắt được). Quyết định + lý do đầy đủ ở ADR-0009.
  - Seed migration `20260705070000_add_dxy_usdvnd_instruments.sql` (idempotent), cập nhật mảng
    `INSTRUMENTS` trong Edge Function `ingest-gold` + README (cảnh báo kiểm tra kỹ 2 mã mới).
  - **Kiểm chứng THẬT bằng trình duyệt:** screenshot `/chart/dxy` và `/chart/usdvnd` — nến + SMA +
    RSI + khối gợi ý phân tích hiển thị đúng, giá trị hợp lý (DXY ~100–106, USD/VND ~26.000–28.000).
  - `e2e/dxy-usdvnd.spec.ts` (4 test: render DXY, render USD/VND, thanh chuyển mã đủ 4 mã, axe) —
    chạy thật, 60/60 E2E xanh toàn repo (desktop+mobile, gồm test cũ không phá).
  - Sửa 1 test cũ bị lỗi thời do đổi trạng thái: `lib/instruments.test.ts` và
    `lib/providers/twelvedata.test.ts` từng dùng `'DXY'` làm ví dụ "mã không hỗ trợ" — đổi sang
    `'NOPE'` vì DXY nay đã hỗ trợ.
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (173/173, 28 file)
    · `build` ✅ (4 route SSG: xauusd/xagusd/dxy/usdvnd).

- ✅ **So sánh giá vàng SJC/BTMC vs thế giới quy đổi (2026-07-05, người dùng chọn hạng mục backlog
  "So sánh SJC vs thế giới"):**
  - `lib/gold-compare/convert.ts`: quy đổi giá vàng thế giới (USD/troy oz) sang VND/lượng
    (1 lượng = 37,5g, 1 troy oz = 31,1034768g — hằng số quốc tế chính xác, không phải số đo gần
    đúng) rồi so với giá trong nước (buy/sell). Pure function, không phụ thuộc fetch. 3 unit test
    **giá trị tính tay bằng máy tính độc lập** (không copy output của chính hàm đang test): quy đổi
    cơ bản + ca trong nước đắt hơn thế giới (diff dương) + ca trong nước rẻ hơn (diff âm).
  - `components/gold-compare/use-gold-compare.ts`: gộp 3 nguồn (`/api/domestic-gold` +
    `/api/candles?symbol=XAUUSD&timeframe=1D` + `/api/candles?symbol=USDVND&timeframe=1D`, đều đã có
    sẵn từ Đợt 1/2/9 — không thêm API mới), lấy nến đóng cửa GẦN NHẤT làm mốc giá thế giới. Thiếu bất
    kỳ nguồn nào (mảng nến rỗng) → trả `rows` rỗng, KHÔNG đoán giá trị (cùng nguyên tắc pure rule ở
    `lib/analysis/`). Mốc thời gian hiển thị lấy nến **CŨ HƠN** trong 2 nến XAU/USD và USD/VND (thận
    trọng — không tự nhận "mới hơn" thực tế của nó). 3 unit test (thành công, thiếu nến, 1 nguồn lỗi).
  - `components/gold-compare/compare-table.tsx` + trang `app/so-sanh-gia-vang/` (page + page-client,
    4 trạng thái UI, link từ trang chủ + `app/sitemap.ts`).
  - **Chạy axe thật, phát hiện & vá 1 lỗi a11y thật ở mobile viewport:** bảng 4 cột tràn ngang ở
    375px → axe `scrollable-region-focusable` (vùng cuộn ngang phải nhận được focus bàn phím) —
    thêm `role="region"` + `aria-label` + `tabIndex={0}` vào container cuộn; xác nhận lại axe 0 vi
    phạm cả 2 viewport (bảng ở `gia-vang-trong-nuoc` chỉ 3 cột nên chưa từng tràn, không gặp lỗi
    này — không cần sửa ngược).
  - `e2e/gold-compare.spec.ts` (4 test: hiển thị bảng + mốc thời gian, chênh lệch % từng dòng, axe,
    điều hướng từ trang chủ) — chạy thật, xanh cả desktop+mobile.
  - **Môi trường E2E sandbox** (không đổi config repo, hết sau phiên): browser rev 1228 thiếu, tự
    symlink sang rev 1194 sẵn có + shim tên file `chrome-headless-shell` (cùng vấn đề đã ghi ở Đợt 6–8
    — môi trường sandbox khác, không phải lỗi code).
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (185/185, 32 file)
    · `build` ✅ (5 trang tĩnh mới: `so-sanh-gia-vang`). E2E 72/72 xanh (desktop+mobile) trừ 1 lần
    flake đã biết ở `indicators.spec.ts` (locale POSIX sandbox — xem "Nợ kỹ thuật", không liên quan
    tính năng này, xác nhận lại pass khi chạy riêng).

- ✅ **Đợt 10 — Bề mặt phân tích: MTF confluence + Screener + Ratio/Correlation (2026-07-13, người
  dùng chốt hướng "Đợt 10: A+B(+C)", ADR-0010, đặc tả `docs/plans/xgold-analysis-surface-plan.md`):**
  - **Lib pure TS (tái dùng engine `lib/analysis/` sẵn có, KHÔNG thêm dependency/schema):**
    - `lib/analysis/multi-timeframe.ts` (`computeConfluence`): chạy `suggestLatest` cho 1h/4h/1D/1W,
      tổng hợp `buyCount/sellCount/neutralCount` + `meanNorm` (trung bình `score/maxScore` trên các
      khung CÓ suggestion, bỏ khung null — không chia 0) + `overall` theo ngưỡng `±0.25`. 6 unit test
      tính tay (mọi khung Mua, khung thiếu nến bị loại khỏi mean, không khung nào có dữ liệu, ngưỡng
      biên `+0.25`/`-0.25` chính xác, mean=0).
    - `lib/analysis/ratio.ts`: `ratioSeries` (inner join theo `ts`, bỏ `b.close<=0`), `simpleReturns`
      (bỏ chia 0 khi `close[i-1]=0`), `pearson` (kẹp `[-1,+1]`, `null` khi <2 điểm hoặc phương sai 0),
      `correlationXauDxy` (align → lợi suất → Pearson trên `window` điểm gần nhất). 14 unit test tính
      tay (tỷ lệ cơ bản 3200/40=80, align bỏ đúng `ts` lệch, đồng biến/nghịch biến hoàn hảo ±1,
      phương sai 0 → null, tương quan lợi suất nghịch biến hoàn hảo → -1).
    - Export qua `lib/analysis/index.ts` (cùng barrel file sẵn có).
  - **Disclaimer dùng chung (DRY):** tách `components/chart/analysis-disclaimer.tsx` từ chuỗi vốn
    inline trong `analysis-panel.tsx` (giữ nguyên chữ + style) — `analysis-panel`, `confluence-panel`,
    `screener-table` cùng import, không chép chuỗi disclaimer ở nhiều nơi.
  - **Tính năng A (MTF):** `components/chart/use-confluence.ts` (chỉ fetch 1h+1D, suy 4h/1W bằng
    `resample` sẵn có, dùng đúng `config.analysis` người dùng đang đặt trên trang chart) +
    `confluence-panel.tsx` (bảng 4 khung + dòng tổng hợp, `role="region"` + `tabIndex={0}` +
    `aria-label`), cắm dưới `analysis-panel` trên `/chart/[symbol]`.
  - **Tính năng B (Screener):** trang `/quet-tin-hieu` (`page.tsx` + `page-client.tsx`),
    `components/screener/use-screener.ts` (fetch song song mọi mã trong `INSTRUMENTS`, một mã lỗi/rỗng
    chỉ làm dòng đó "—" chứ không hỏng cả bảng, `status='error'` chỉ khi TẤT CẢ lỗi) +
    `screener-table.tsx` (cột Mã/Giá/Tín hiệu/Độ mạnh/RSI14/Xu hướng/Nguồn, sort theo độ mạnh đảo
    chiều được, vùng cuộn ngang a11y). Link từ `app/page.tsx` + `app/sitemap.ts`.
  - **Tính năng C (Ratio/Correlation):** `components/screener/market-context.tsx` (thẻ Tỷ lệ
    Vàng/Bạc + Tương quan XAU↔DXY 30 phiên, "chưa đủ dữ liệu" khi thiếu mã, KHÔNG đoán) trên trang
    screener; `use-screener` tái dùng nến 1D đã fetch khi screener đang ở khung 1D (không fetch
    trùng), chỉ fetch riêng 1D cho XAU/XAG/DXY khi khung khác 1D.
  - **Phát hiện & vá 1 lỗi a11y thật khi thêm `confluence-panel.tsx`:** vùng cuộn ngang bảng MTF thiếu
    `tabIndex={0}` → axe `scrollable-region-focusable` trên MỌI trang chart (mobile) — vá theo đúng
    pattern đã áp ở `so-sanh-gia-vang` (Đợt "So sánh giá vàng"), xác nhận lại axe 0 vi phạm.
  - **Cập nhật 2 test E2E cũ bị strict-mode violation do disclaimer dùng chung xuất hiện 2 lần trên
    trang chart** (`e2e/analysis.spec.ts`): scope assertion vào đúng khối `analysis-panel` (2 khối
    cùng có chữ "không phải lời khuyên đầu tư" là ĐÚNG theo thiết kế, không phải lỗi).
  - **Coverage:** thêm unit test cho 2 hook fetch (`use-confluence.test.ts`, `use-screener.test.ts`,
    theo đúng pattern `use-candles.test.ts`/`use-gold-compare.test.ts` — mock `fetch`, kiểm cancel khi
    đổi symbol/khung, kiểm 1 mã lỗi không hỏng cả bảng). Thêm exclude coverage cho các
    component/route thuần trình bày mới (che bằng E2E, cùng quy ước đã có trong `vitest.config.ts`
    cho `indicator-panel.tsx`/`timeframe-switcher.tsx`...).
  - `e2e/confluence.spec.ts` (3 test: đủ 4 khung + dòng tổng hợp, disclaimer, axe) + `e2e/screener.spec.ts`
    (6 test: bảng đủ mã + đổi khung, sort đảo chiều, thẻ bối cảnh thị trường, disclaimer, điều hướng
    từ trang chủ, axe) — chạy thật, 9/9 xanh (desktop), full suite 86/86 xanh (desktop+mobile) trừ 1
    lần flake đã biết ở `indicators.spec.ts` (locale sandbox, không liên quan, pass khi chạy riêng).
  - 5 cổng local đều đạt: `lint` ✅ · `type-check` ✅ · `format:check` ✅ · `test` ✅ (207/207, 34 file,
    coverage 89.49%/75.49%/82.65%/91.67% — vượt sàn 70%) · `build` ✅ (thêm route tĩnh `quet-tin-hieu`).
  - **Môi trường E2E sandbox** (không đổi config repo, hết sau phiên): cùng vấn đề đã ghi ở các đợt
    trước (browser rev 1228 thiếu, symlink sang rev sẵn có + shim `chrome-headless-shell-linux64`).

- **Đợt 11 — Mây Ichimoku + xếp chồng RSI + Entry/SL/TP/Xác suất/Rủi ro (ADR-0011, 2026-07-13):**
  người dùng dán đặc tả một chỉ báo TradingView (Pine Script) và yêu cầu tích hợp phần tốt vào
  engine hiện có.
  - Hỏi người dùng trước khi code vì Entry/SL/TP + Xác suất % mâu thuẫn trực tiếp ranh giới
    "không entry/SL/TP" đã chốt ở ADR-0007/0010 — người dùng chọn **lật lại** (ADR-0011), cập nhật
    Trạng thái của 2 ADR cũ để trỏ sang ADR-0011 (không sửa nội dung ADR cũ).
  - `lib/indicators/atr.ts` (ATR Wilder trên True Range) + `lib/indicators/ichimoku.ts`
    (`ichimokuCloud` — mây Senkou A/B donchian-based, chỉ mây; `cloudAt` — biên mây đã dịch tới
    trước `displacement` nến).
  - 2 rule mới cắm vào engine trọng số sẵn có (KHÔNG port hệ thống cộng dồn ad-hoc của Pine): R6
    `ichimoku-cloud`, R7 `rsi-stack` (RSI 10/14/21). Trọng số 7 rule phân bổ lại về tổng 1.0
    (`lib/analysis/config.ts`).
  - `lib/analysis/trade-levels.ts` (`computeTradeLevels`) — Xác suất/Rủi ro/Entry/SL/TP1/TP2, công
    thức phỏng theo (không port nguyên văn) đặc tả Pine, chỉ có giá trị khi gợi ý là Mua/Bán.
  - UI: `indicator-panel.tsx` (toggle + 4 tham số mây), `analysis-panel.tsx` (2 nhãn rule mới + khối
    "Mức tham chiếu giao dịch"), `gold-chart.tsx` (vẽ Span A/B dịch tới trước bằng kỹ thuật
    whitespace time, không tô vùng giữa 2 đường ở v1 — nhất quán Bollinger), disclaimer mạnh hơn.
  - Kiểm chứng thật bằng trình duyệt (Playwright thủ công, không phải chỉ test): bật mây Ichimoku
    không vỡ chart; đổi khung 1D ra tín hiệu Bán thật → khối "Mức tham chiếu giao dịch" hiện đúng
    Xác suất 59% / Rủi ro Trung bình / Entry-SL/TP1-TP2 hợp lý (SL đúng phía, TP đúng hướng).
  - 5 cổng local đều đạt: `build` ✅ · `type-check` ✅ · `lint` ✅ (0 cảnh báo) · `format:check` ✅ ·
    `test` ✅ (225/225, gồm test mới cho ATR/Ichimoku/2 rule/trade-levels tính tay).
  - Việc chưa làm trong đợt này (có thể cân nhắc sau, không chặn): mở rộng `backtest.ts` để đo tần
    suất R/R đạt TP1/TP2 trên dữ liệu lịch sử; chưa tô màu vùng giữa Span A/B trên chart (v1 chỉ vẽ
    2 đường).

- **Đợt 12 — Dải khung thời gian đầy đủ kiểu TradingView 5m → 1M (2026-07-16):** người dùng yêu cầu
  "nến Nhật từ m5 → M" theo chuẩn TradingView.
  - `lib/candles/types.ts`: `TIMEFRAMES` mở rộng thành 8 khung `5m/15m/30m/1h/4h/1D/1W/1M`;
    `BASE_TIMEFRAMES` thêm `5m` (3 khung cơ sở lưu DB: 5m/1h/1D); thêm `TIMEFRAME_LABELS` — nhãn
    nút gọn kiểu TradingView (`D`/`W`/`M` cho khung ngày trở lên).
  - `lib/candles/resample.ts`: export `SOURCE_TIMEFRAME` (nguồn sự thật khung nào gộp từ khung nào —
    15m/30m từ 5m, 4h từ 1h, 1W/1M từ 1D) + bucket 15m/30m (mốc phút UTC) và 1M (tháng dương lịch
    UTC mốc ngày 01, đúng cả ranh giới sang năm). `/api/candles` dùng chung map này (bỏ hàm trùng).
  - Dữ liệu mẫu: `SampleSet` thêm dải `m5` (5 ngày × 288 nến, seed +100 tránh trùng seed mã kế);
    dải `daily` kéo dài 180 → 1095 nến (3 năm, 2023-07-08→2026-07-06) để khung 1W (~156 nến) và 1M
    (~37 nến) đủ dày. Cả 4 mã trong registry có đủ 3 dải mẫu.
  - Nguồn dữ liệu thật: Twelve Data thêm interval `5min`; Edge Function `ingest-gold` thêm job 5m
    (outputsize 15, đủ bù lịch cron mỗi giờ — README ghi rõ đánh đổi độ trễ ≤1h và cách rút ngắn
    lịch kèm tính toán hạn mức free tier); `scripts/backfill.ts` thêm task 5m (5000 nến ≈ 17 ngày).
  - Migration `20260716080000_expand_timeframes_m5_to_1m.sql`: nới CHECK `candles.timeframe` lên đủ
    8 giá trị (có ghi cách rollback).
  - Test: resample thêm 5m identity + 5m→15m/30m + 1D→1M (ranh giới năm); route sample thêm 5m/15m/
    30m/1M; fixtures thêm dải M5; E2E thêm test đủ 8 nút khung + chuyển 2 khung biên (5m, M) chart
    vẫn render. Cổng: `build` ✅ · `type-check` ✅ · `lint` ✅ · `format` ✅ · `test` ✅ (237/237) ·
    E2E ✅ (88/88 desktop+mobile).
  - Chưa làm (không chặn): khung giây/phút-1 (Twelve Data free tier không đáng tin cho 1min spot
    metals); tô khối lượng (volume pane) — cân nhắc đợt UI chart riêng.

- **Đợt 13 — Volume + legend OHLC kiểu TradingView (2026-07-16):** tiếp mạch "tính năng đầy đủ cho
  chart" sau Đợt 12.
  - **Thanh khối lượng**: HistogramSeries overlay 20% đáy pane giá (bố cục mặc định TradingView),
    thang giá riêng `volume` không kéo méo thang nến, màu theo nến tăng/giảm (alpha 0.35); toggle ở
    IndicatorPanel, **bật mặc định** như TradingView; `ChartConfigSchema` thêm khóa `volume` với
    `.default()` giữ tương thích URL/localStorage cũ. Nến thiếu volume (null) bỏ qua điểm đó.
  - **Legend OHLC**: `lib/candles/legend.ts` (`legendAt` — Δ so với CLOSE nến trước đúng quy ước
    TradingView, nến đầu so với open chính nó, chống chia 0; format có dấu ±/%); overlay góc trên
    trái chart, rê crosshair hiện nến dưới con trỏ, rời chart về nến mới nhất, màu theo hướng.
  - Test: unit 245/245 (legend 8 case + config volume backward-compat); E2E 92/92 desktop+mobile
    (legend hiển thị đủ O/H/L/C+%, volume bật mặc định + tắt/bật không vỡ chart). Sửa race sẵn có
    của test MACD (chụp baseline canvas trước khi chart dựng đủ pane — chờ ổn định 2 lần đọc).
  - Cổng: `build` ✅ · `type-check` ✅ · `lint` ✅ · `format` ✅ · `test` ✅ · E2E ✅.
- **Đợt 14 — Export CSV (2026-07-16):** dọn nốt mục backlog làm được trong sandbox (không cần
  deploy Supabase thật).
  - `lib/candles/csv.ts` thuần TS: `candlesToCsv` (dòng tiêu đề `time,open,high,low,close,volume`,
    escape ô có dấu phẩy/ngoặc kép/xuống dòng theo chuẩn CSV, `volume` rỗng khi `null`) +
    `candlesCsvFileName` (`<symbol>-<timeframe>-candles.csv`).
  - Nút "Xuất CSV" trên `app/chart/[symbol]/chart-page-client.tsx` (chỉ hiện khi có dữ liệu nến) —
    tạo `Blob` + tải qua thẻ `<a download>`, không cần thư viện ngoài.
  - Test: unit mới (`csv.test.ts`, tổng 248/248) + xác nhận **thật bằng trình duyệt** (Playwright
    thủ công qua Chromium có sẵn): bấm nút → tải đúng file `xauusd-1h-candles.csv`, nội dung đúng cột
    và dữ liệu khớp chart.
  - Cổng: `build` ✅ · `type-check` ✅ · `lint` ✅ · `format` ✅ · `test` ✅ (248/248).

## Đang làm

- ✅ **Đợt 14 — TradingView parity: kiểu chart + tiện ích thang giá (2026-07-17, PLAN.md/ADR-0012,
  điều phối qua Kiến trúc 3 tầng — coordinator + 5 worker):**
  - **W-501** `lib/candles/heikin-ashi.ts` (`toHeikinAshi`, pure fn, 4 test tính tay, coverage 100%).
  - **W-503** thang giá Log/Linear (`ChartConfig.priceScaleMode`, `.default('normal')`) + nút Auto
    fit (`timeScale().fitContent()`).
  - **W-504** countdown nến hiện tại trong legend (`candleCountdown` + `timeframeDurationSeconds`,
    test tính tay khung 1h → 44:30).
  - **W-505** fullscreen (Fullscreen API + fallback không throw) + chụp ảnh chart PNG
    (`chart.takeScreenshot()`, đúng pattern appendChild/click/removeChild — tránh lặp lại F-011).
  - **W-502** (route:complex, việc khó nhất) — chọn 5 kiểu chart (Nến/Heikin Ashi/Bar/Line/Area):
    refactor `gold-chart.tsx` sang union `ISeriesApi<SeriesType>` + Effect quản lý vòng đời series
    chính khi đổi kiểu, giữ nguyên markers/legend/priceScale/countdown/overlay hoạt động đúng qua
    mọi kiểu; không `as any`/cast bừa.
  - Cổng: `build` ✅ (13 route) · `type-check` ✅ · `lint` ✅ (0 cảnh báo) · `format:check` ✅ ·
    `test` ✅ (308/308, 45 file). Review (code-review) 0 phát hiện chặn (1 mục comment sai đã sửa).
    **Lighthouse thật cả 5 URL** không tụt ngưỡng sau khi thêm JS (performance 0.98–1.0, a11y 1.0,
    CLS 0.000, LCP 446–1069ms).
  - **Cần kiểm chứng thủ công ngoài sandbox** (E2E chưa chạy được — Playwright browser bị chặn tải,
    giới hạn môi trường đã biết): screenshot 5 kiểu chart × 2 theme, markers/legend đúng sau đổi
    kiểu, nội dung file PNG chụp được, thang log giãn không đều bằng mắt.
  - **Điểm cần chốt sản phẩm (không chặn, chỉ ghi nhận):** legend OHLC ở chế độ Heikin Ashi hiển thị
    giá GỐC (không phải giá HA đã làm mượt) — quyết định có chủ đích, cần xác nhận đúng ý đồ khi có
    dịp kiểm chứng thật.
  - Còn lại theo `docs/plans/xgold-tradingview-parity-plan.md`: Đợt 15 (symbol search/watchlist/so
    sánh mã), Đợt 16 (công cụ vẽ, ADR-0012 đã chốt), Đợt 17 (alerts v1 client-side).

- ✅ **Vòng `/completion` thứ 2 ĐÃ ĐÓNG HẲN (2026-07-17):** PR #31/#32/#33/#34 đều đã merge vào
  `main` (`6989fb2`). Đã chạy lại toàn bộ 5 cổng local trên trạng thái `main` này: `type-check` ✅ ·
  `lint` ✅ (0 cảnh báo) · `format:check` ✅ · `test` ✅ (282/282, 44 file) · `build` ✅ (13 route,
  gồm 4 SSG `/chart/[symbol]`). Chạy lại **Lighthouse CI thật** (`npx lhci autorun`, Chrome
  `/opt/pw-browsers/chromium-1194`, `--no-sandbox`) trên bản build production của `main` — cả 5 URL
  (`/`, `/chart/xauusd`, `/gia-vang-trong-nuoc`, `/quet-tin-hieu`, `/so-sanh-gia-vang`) × 3 lần chạy:
  "All results processed!", 0 assertion lỗi (đạt ngưỡng performance/a11y/best-practices/seo ≥0.9,
  LCP ≤2500ms, CLS ≤0.1 — không cần nới ngưỡng, khớp kết quả W-406 đã đo trên nhánh riêng trước khi
  merge). Bước upload lên `temporary-public-storage` thất bại do mạng sandbox chặn (không ảnh hưởng
  kết quả assertion — cùng vấn đề môi trường đã ghi nhận nhiều đợt trước). **Khuyến nghị đóng ở nhật
  ký hội tụ Pha 4 nay đã thực hiện xong — vòng 2 hoàn tất.**
- Vòng `/completion` đầu tiên (2026-07-03) đã hoàn tất trọn vòng đời: Pha 0 (FEATURE-MAP.md +
  CONVENTIONS.md) → Pha 1 (audit 12 nhóm, `COMPREHENSIVE-AUDIT-STATUS.md`) → Pha 2 (kế hoạch
  `docs/ops/COMPLETION-PLAN.md`, người dùng duyệt) → Pha 3 (Đợt 1–3, PR #8/#10/#11, tất cả đã merge)
  → Pha 4 (hội tụ, xem mục "Báo cáo hoàn thiện" bên dưới). PR #1–#11 đều đã merge vào `main` (squash),
  bao gồm release 1.0.0 + 1.0.1. Toàn bộ CI trên `main` (`96bf5e3`) xanh: `CI`, `CodeQL`,
  `Secret scan`, `Release` đều `success`. Đã xác nhận chạy thật local: `npm run dev` qua trình
  duyệt + đủ 5 cổng xanh (`build`/`type-check`/`lint`/`format:check`/`test` 95/95, coverage thật
  89.64%/73.48%/89.47%/91.42%) + 32/32 E2E xanh (desktop+mobile) + Lighthouse thật trên cả 3 trang
  (performance 1.0, CLS 0, LCP 392–677ms).

### Báo cáo hoàn thiện vòng 2 (Pha 4 — 2026-07-16)

Nguồn: audit lại 12 nhóm trên trạng thái Đợt 6–14 (`docs/ops/COMPREHENSIVE-AUDIT-STATUS.md`, quét lại
lần 2) → kế hoạch 3 đợt, 9 việc (`docs/ops/COMPLETION-PLAN.md`, người dùng duyệt cả 3 đợt) → thực thi
qua PR #31 (tài liệu Pha 0/1/2), #32 (Đợt 1), #33 (Đợt 2+3, gộp chung một PR vì Đợt 3 nhỏ).

**10 phát hiện (F-011..F-020), kết cục:** 1 Cao (F-012, `analysis-panel.tsx` 0%→96.29% coverage) +
2 Trung liên quan hiển thị giao dịch (F-011 lỗi `appendChild` nút CSV, F-018 `trade-levels.ts` nửa
vời) đã vá tận gốc có test hồi quy (Đợt 1); 3 Trung + 1 Thấp (F-013/F-014 coverage UI 0%→60-100%,
F-015 Lighthouse thiếu 2 route, F-020 nhánh resample chưa test) đã lấp (Đợt 2); 2 Thấp còn lại
(F-016 tài liệu lệch, F-019 dependency lệch major) đã xử lý — F-016 vá, F-019 quyết định hoãn có lý
do (Đợt 3). Coverage toàn repo 89%→94.61% statement. Chi tiết đầy đủ + bằng chứng từng việc: xem
`docs/ops/COMPLETION-PLAN.md`.

**Còn lại trước khi đóng hẳn:** merge PR #31→#32→#33 theo FIFO, chạy lại Lighthouse thật trên `main`
sau merge (đã xác nhận trên nhánh riêng ở W-406, nên xác nhận lại 1 lần trên trạng thái tích hợp).

### Báo cáo hoàn thiện (Pha 4 — 2026-07-03)

Nguồn: audit 12 nhóm (`docs/ops/COMPREHENSIVE-AUDIT-STATUS.md`) → kế hoạch 3 đợt, 9 việc
(`docs/ops/COMPLETION-PLAN.md`) → thực thi qua PR #8 (Đợt 1), #10 (Đợt 2), #11 (Đợt 3).

**10 phát hiện (F-001..F-010), kết cục:**

| ID    | Mức độ                                 | Kết cục                                                                                |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| F-009 | Cao                                    | ✅ Đã vá (coerce Zod dữ liệu numeric từ Supabase, cả 2 API route)                      |
| F-003 | Cao                                    | ✅ Đã vá (`coverage.include`, viết test thật cho các module lõi từng thiếu)            |
| F-010 | Cao (phát hiện mới lúc thực thi Đợt 2) | ✅ Đã vá (CLS thật 0.324→0 trên `/chart/xauusd`, sửa min-height placeholder)           |
| F-001 | Trung                                  | ✅ Đã vá (`overrides.postcss` trong `package.json`, 0 lỗ hổng)                         |
| F-004 | Trung                                  | ✅ Đã vá (Lighthouse CI đo cả 3 trang thay vì chỉ trang chủ)                           |
| F-005 | Thấp                                   | ✅ Đã vá (cờ `isHydrated`, test hồi quy xác nhận đỏ→xanh)                              |
| F-006 | Thấp                                   | ✅ Đã vá (`.refine()` id duy nhất trong `ChartConfigSchema`)                           |
| F-007 | Thấp                                   | ✅ Đã vá (comment `database.types.ts` cập nhật đủ 2 migration)                         |
| F-002 | — (báo động giả)                       | ➖ Rút lại — `.env.example` đã tồn tại từ trước, lỗi do quyền sandbox chặn đọc `.env*` |
| F-008 | Thấp (đã biết)                         | Chưa sửa có chủ đích — cần ảnh icon thật từ người dùng (xem "Nợ kỹ thuật")             |

**Kết quả hội tụ:** 0 phát hiện mức Cao còn mở; F-008 (Thấp) là nợ kỹ thuật có chủ đích, không phải
bỏ sót. Quét lại toàn bộ 5 cổng + E2E + Lighthouse trên trạng thái cuối của `main` (commit `96bf5e3`)
sau khi merge cả 3 PR — không phát sinh phát hiện Cao mới.

**Definition of Complete — đối chiếu:**

- [x] 0 phát hiện Cao còn mở.
- [x] Mọi luồng chính (FEATURE-MAP.md) có E2E — 32/32 xanh.
- [x] Coverage phản ánh đúng thực tế (`coverage.include`) — 89.64%/73.48%/89.47%/91.42%, vượt ngưỡng 70%.
- [x] Mọi bug từng sửa có test hồi quy ở lại (F-005, F-009 x2 route).
- [x] Nhóm 12 sạch — pattern coerce Supabase đã hợp nhất về 1 cách (`CONVENTIONS.md`).
- [x] Cổng tự động đang chặn thật (pre-commit hook + CI 4 workflow xanh trên `main`).
- [x] Bảo mật: `npm audit --omit=dev` 0 lỗ hổng; RLS đã test bằng ca "thử vượt quyền" (Đợt 1 MVP).
- [x] Tài liệu khớp code thật: `PROJECT.md`/`CLAUDE.md` §10/`FEATURE-MAP`/ADR không còn mục lỗi thời.
- [x] Hiệu năng đạt ngân sách — Lighthouse thật cả 3 trang, số liệu ghi ở trên.
- [x] `PROGRESS.md` phản ánh đúng trạng thái + nợ kỹ thuật còn lại đều có chủ đích (mục dưới).

## Tiếp theo

- ✅ **Kế hoạch phát triển toàn diện sau MVP: ĐÃ CHỐT và ĐÃ THỰC THI Đợt 6–8 (2026-07-04)** —
  người dùng duyệt "theo đề xuất" cả 5 điểm mục 6 của `docs/plans/xgold-development-plan.md`;
  ADR-0007 ghi quyết định pure TS không thêm dependency. Kết quả xem mục "Đã xong" (Đợt 6–8).
  Còn lại của kế hoạch: hướng A (deploy thật — chờ người dùng, xem mục dưới) và backlog cũ
  (alerts nay đã có nền engine, ~~thêm symbol~~ **✅ XAG/USD (Đợt 9) + DXY/USD-VND (2026-07-05,
  ADR-0009) xong**, ~~export CSV~~ **✅ xong (Đợt 14, 2026-07-16)**, ~~so sánh SJC vs thế giới quy
  đổi~~ **✅ xong (2026-07-05, xem `lib/gold-compare/`)**).
- ✅ **Đợt 10 — Bề mặt phân tích (MTF confluence + Screener + Ratio/Correlation): ĐÃ CHỐT và ĐÃ
  THỰC THI (2026-07-13)** — người dùng duyệt "Đợt 10: A+B(+C)" (ADR-0010,
  `docs/plans/xgold-analysis-surface-plan.md`). Kết quả xem mục "Đã xong" (Đợt 10). Backlog còn
  lại có chủ đích hoãn: **alert đẩy thông báo** dựa trên `computeConfluence`/screener (cần deploy
  Supabase thật để chạy nền định kỳ — nêu ở ADR-0010 "Việc tiếp theo"), chart đầy đủ cho
  ratio/correlation (v1 chỉ thẻ số, xem ADR-0010 "Các phương án đã cân nhắc"), panel chỉnh cấu hình
  quy tắc trên screener (v1 dùng `DEFAULT_ANALYSIS_CONFIG`). ~~export CSV~~ **✅ xong (Đợt 14,
  2026-07-16)**.
- **Việc chỉ làm được ngoài sandbox này** (xem "Nợ kỹ thuật"): tạo project Supabase thật + áp
  migration, đăng ký `TWELVEDATA_API_KEY`, deploy + test thật Edge Function `ingest-gold` (theo
  README riêng), chạy `npm run backfill`, bật `pg_cron`. Người dùng đã xác nhận: tiếp tục phát triển
  local trước, nối DB thật sau.
- Backlog sau Đợt 5 — còn lại: Sentry (cần DSN thật), F-008 icon PWA (chờ ảnh thật từ người dùng),
  SJC (hoãn có chủ đích, xem "Nợ kỹ thuật" — ADR-0005). vang.today (ADR-0006) **đã xong**, xem "Đã
  xong" ở trên.
- **i18n/PWA — phạm vi đã CHỐT với người dùng (2026-07-04):**
  - **i18n: tiếp tục hoãn.** Chưa có nhu cầu người dùng/khách hàng thật cho ngôn ngữ thứ 2 — giữ
    nguyên toàn bộ UI tiếng Việt cứng, KHÔNG đụng scaffold `i18n/`. Quyết định của người dùng, không
    phải AI tự suy đoán — không tự ý làm lại nếu không có yêu cầu mới.
  - **PWA: chỉ làm mức tối thiểu** — thêm icon `/icon-192.png`, `/icon-512.png` thật (F-008) để
    `app/manifest.ts` hợp lệ. KHÔNG thêm service worker/cache offline — người dùng xác nhận rủi ro
    hiển thị giá vàng cũ khi offline (trông như giá hiện tại) chưa đáng đánh đổi lấy tính năng
    installable đầy đủ. Đang chờ người dùng gửi 2 file ảnh thật (AI không tự tạo ảnh giả, CLAUDE.md
    §4) để gắn vào `public/`.
- ✅ **CodeQL đã xử lý (2026-07-03):** nguyên nhân thật là repo **private + tài khoản cá nhân** —
  GitHub Advanced Security (bắt buộc để upload kết quả code scanning cho repo private) chỉ có ở
  organization/Enterprise trả phí, không bật được qua Settings dù làm đúng hướng dẫn. Người dùng đã
  quyết định **chuyển repo sang public** (Settings → Danger Zone → Change visibility) — code scanning
  public repo miễn phí cho mọi loại tài khoản. Đã xác minh CodeQL pass thật trên PR #4 sau khi đổi
  visibility (không còn lỗi "Code scanning is not enabled").
- ✅ **Release (release-please) đã xử lý (2026-07-03):** người dùng đã bật "Allow GitHub Actions to
  create and approve pull requests" (Settings → Actions → General → Workflow permissions). Đã xác
  nhận qua `gh api repos/.../actions/permissions/workflow` → `can_approve_pull_request_reviews: true`.
  **Đã xác nhận job `Release` pass thật** trên commit mới nhất của `main` (`8b19187`, PR #5 "chore(main):
  release 1.0.0" — squash merge, tag `xgold-v1.0.0`): cả 4 workflow (`Release`, `CI`, `CodeQL`,
  `Secret scan`) đều `completed`/`success` qua GitHub Actions API. Không còn mục CI nào đỏ trên `main`.

- ⚠️ **PR #9 (release-please "chore(main): release 1.0.1") đang kẹt `action_required`** (2026-07-03):
  workflow trên PR này (bot `github-actions[bot]`) cần chủ repo tự bấm "Approve and run" trên tab
  GitHub Actions — không có API/tool nào ở đây phê duyệt thay được. Release-please đã tự cập nhật
  PR này 2 lần theo các merge PR #8/#11 nhưng CI vẫn 0 check run (chưa từng chạy). Không chặn việc
  khác — chỉ ảnh hưởng tới việc tag phiên bản 1.0.1 tự động.
- **Xem "Báo cáo hoàn thiện" ở mục "Đang làm"** — vòng `/completion` đã đóng hoàn chỉnh (10 phát
  hiện, 9/10 đã vá hoặc rút lại, 1 nợ kỹ thuật có chủ đích F-008).

## Quyết định quan trọng (trỏ tới ADR nếu có)

- Chart: lightweight-charts 5.2.0 (ADR-0002). Nguồn dữ liệu: Twelve Data + Stooq, adapter pattern (ADR-0003).
  CSDL time-series: Postgres thuần, không TimescaleDB (ADR-0004). Stack nền: ADR-0001 (đã có từ khung).
- Node runtime: **22.x LTS "Jod"** (không phải 24.x như bản tư vấn ban đầu) — khớp `.nvmrc` sẵn có của repo
  và môi trường build thực tế; đã ghi rõ lý do đối chiếu lại trong `PROJECT.md` mục 4.
- ESLint ghim ở **9.39.4** (không dùng bản 10.x mới nhất) do lỗi tương thích thật với
  `eslint-plugin-react` bundled trong `eslint-config-next` — xem "Đã xong" ở trên.
- i18n/PWA hoãn tới khi thật sự áp dụng (ngoài phạm vi MVP đã duyệt).

## Nợ kỹ thuật (chỗ "làm tạm" cần quay lại)

- **Dependency lệch major (F-019, W-409, quyết định 2026-07-16):** `npm outdated` cho thấy 3 gói lệch
  major — `typescript` 6.0.3→7.0.2, `eslint` 9.39.4→10.7.0, `@types/node` 22.20.0→26.1.1. **Quyết
  định: hoãn có chủ đích**, không nâng cấp ngay trong vòng hoàn thiện này — nâng major 3 gói cùng lúc
  (2 trong số đó là công cụ build/lint nền tảng) có rủi ro breaking change cao hơn giá trị nhận lại ở
  thời điểm này (không phải lỗ hổng bảo mật, `npm audit --omit=dev` sạch), ngoài phạm vi đã audit/
  duyệt. Nâng cấp khi có nhu cầu cụ thể (tính năng mới cần, hoặc lỗ hổng bảo mật phát sinh) — làm
  riêng từng gói một, không gộp, chạy đủ cổng sau mỗi gói.
- `app/manifest.ts` tham chiếu icon `/icon-192.png`, `/icon-512.png` chưa có file thật — không chặn cổng
  (không phải lỗi build/lint), nhưng cần bổ sung ảnh icon thật trước khi PWA/manifest được dùng nghiêm túc.
- **Chưa test thật được với Supabase/Twelve Data/Stooq thật** (mạng sandbox chặn + không có Docker/Deno):
  `lib/providers/*` chỉ kiểm bằng fixture (đã unit test kỹ); `supabase/functions/ingest-gold/index.ts`
  hoàn toàn chưa chạy thử — làm theo README cùng thư mục (test bằng `curl` thật) NGAY sau khi deploy,
  trước khi bật lịch `pg_cron`; `scripts/backfill.ts` mới dry-run được phần import/env, chưa gọi API thật.
- **Mã Twelve Data của DXY/USD-VND đặc biệt chưa chắc chắn** (ADR-0009, độ tin cậy thấp hơn các mã
  khác — suy từ tìm kiếm gián tiếp, không đọc được tài liệu gốc do mạng chặn): kiểm tra kỹ hơn ở bước
  field-verification. Stooq **chủ động chưa hỗ trợ** 2 mã này (ticker chưa xác nhận được, xem
  `lib/providers/stooq.ts`) — nếu cần backfill lịch sử dài, phải xác nhận ticker thật trước khi thêm.
- `lib/supabase/database.types.ts` viết tay — khi có project Supabase thật, chạy
  `supabase gen types typescript` và đối chiếu lại (không tự động, không sinh migration mới).
- Migration đã test bằng Postgres 16 thuần + role giả lập `anon`/`authenticated`/`service_role` — nên
  test lại một lần trên Supabase project thật (`supabase db push` tới project staging) vì nền tảng thật
  có thể có default privileges/extension khác với môi trường giả lập.
- **Sentry chưa cấu hình** — hoãn có chủ đích (cần DSN thật để kiểm chứng, không cắm mù). Khi có tài
  khoản Sentry: `npm install @sentry/nextjs`, làm theo `docs/framework/quality-supplements.md` PHẦN 4,
  set `SENTRY_DSN` (đã có sẵn field optional trong `lib/env.ts`).
- **Đợt 5 Field verification pending** (ưu tiên sau merge): BTMC XML endpoint phải test curl + đối chiếu field thật, xem `supabase/functions/ingest-domestic-gold/README.md` Bước 3. Chưa chạy được trong sandbox (không có Deno, mạng chặn BTMC). Khi deploy thật: test bắt buộc NGAY trước khi bật pg_cron.

## Bàn giao phiên (điền khi WIND-DOWN gần chạm limit 5h — để phiên sau "tiếp tục")

- (chưa cần — MVP Đợt 0–4 đã xong trong phiên này, chưa tới ngưỡng wind-down)
