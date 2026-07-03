# PROGRESS.md — Trạng thái dự án Xgold

> Cập nhật sau mỗi mốc đáng kể. AI đọc file này để biết đang ở đâu.
> (Repo trước đây là khung/template trống; đợt này bootstrap thành dự án Xgold thật —
> nhật ký phát triển khung cũ không còn liên quan, xem lịch sử Git nếu cần tra lại.)

## Giai đoạn hiện tại

- GĐ 4 — Phát triển. Chạy `/auto` theo kế hoạch đã duyệt (kế hoạch triển khai chi tiết được trình bày
  và duyệt qua Plan Mode trong phiên bootstrap, không lưu trong repo), triển khai từng đợt qua `/gate`.
  Xem lộ trình đầy đủ ở `docs/plans/xgold-mvp-plan.md` mục 6 và 9.

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

## Đang làm

- Chuẩn bị Đợt 4 — Hoàn thiện MVP: E2E đầy đủ luồng chính còn lại, Sentry, README/runbook, rà tối ưu
  mã nguồn, báo cáo xác thực cổng merge.

## Tiếp theo

- Đợt 4 (hoàn thiện MVP: Sentry, docs, tối ưu mã nguồn, báo cáo xác thực).
  Chi tiết: `docs/plans/xgold-mvp-plan.md` mục 6.
- Theo dõi CI của PR #1 (nhánh `claude/financial-data-trading-indicators-cwbvf6`), merge khi xanh
  (CLAUDE.md §8) — lưu ý CodeQL sẽ vẫn đỏ cho tới khi chủ repo bật "Code scanning" trong Settings.

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
- **Chưa test thật được với Supabase/Twelve Data/Stooq thật** (mạng sandbox chặn + không có Docker/Deno):
  `lib/providers/*` chỉ kiểm bằng fixture (đã unit test kỹ); `supabase/functions/ingest-gold/index.ts`
  hoàn toàn chưa chạy thử — làm theo README cùng thư mục (test bằng `curl` thật) NGAY sau khi deploy,
  trước khi bật lịch `pg_cron`; `scripts/backfill.ts` mới dry-run được phần import/env, chưa gọi API thật.
- `lib/supabase/database.types.ts` viết tay — khi có project Supabase thật, chạy
  `supabase gen types typescript` và đối chiếu lại (không tự động, không sinh migration mới).
- Migration đã test bằng Postgres 16 thuần + role giả lập `anon`/`authenticated`/`service_role` — nên
  test lại một lần trên Supabase project thật (`supabase db push` tới project staging) vì nền tảng thật
  có thể có default privileges/extension khác với môi trường giả lập.

## Bàn giao phiên (điền khi WIND-DOWN gần chạm limit 5h — để phiên sau "tiếp tục")

- (chưa cần — phiên đang trong Đợt 3, chưa tới ngưỡng wind-down)
