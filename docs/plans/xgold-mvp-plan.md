# Kế hoạch phát triển Xgold — Web app dữ liệu tài chính (vàng) + chart kiểu TradingView

> **Trạng thái: ĐÃ CHỐT — đang triển khai qua `/auto`** (xem mục 9). PROJECT.md + ADR 0002–0004 đã điền ở Đợt 0.
> Mọi phiên bản dưới đây **đã xác minh bằng nguồn sống ngày 2026-07-03** (npm registry, nodejs.org, tài liệu chính thức).

## 1. Phân loại & hồ sơ (KHUNG-3 PHẦN A0)

| Thành phần                                 | Loại        | Hồ sơ                                                                                      |
| ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------ |
| Web app hiển thị chart + quản lý indicator | Web app     | **C1** (mặc định của scaffold này)                                                         |
| Thu thập dữ liệu định kỳ (ingestion)       | Dịch vụ nền | **C4 thu gọn** — gói trong Supabase Edge Function + pg_cron, KHÔNG cần service riêng ở MVP |

## 2. Vấn đề & người dùng (KHUNG-3 PHẦN A)

- **Vấn đề:** theo dõi giá vàng trên chart kỹ thuật (nến + indicator) với dữ liệu lịch sử **lưu trong DB của mình** — không phụ thuộc nguồn ngoài, làm nền cho phân tích/cảnh báo sau này.
- **Người dùng mục tiêu:** nhà đầu tư cá nhân quan tâm vàng (trước hết là chính chủ dự án); mở rộng dần.
- **Đối thủ & khác biệt:** TradingView đã có XAU/USD rất tốt — khác biệt của Xgold là (a) dữ liệu nằm trong DB mình để tự phân tích, (b) có thể gộp **giá vàng trong nước** (SJC/DOJI/BTMC) mà TradingView không có, (c) tùy biến indicator theo ý (Multi-RSI).

## 3. Phạm vi MVP (MoSCoW)

**Must have** (mỗi mục có tiêu chí chấp nhận khi điền PROJECT.md):

1. Thu thập & lưu OHLC **XAU/USD** khung **1h + 1D** vào Postgres; backfill lịch sử ≥ 5 năm daily; upsert idempotent; log mỗi lần chạy (`ingest_runs`).
2. **Chart nến** kiểu TradingView (lightweight-charts): zoom/pan, crosshair, chuyển khung 1h / 4h / 1D / 1W (4h & 1W resample từ 1h & 1D).
3. **Multi-MA:** nhiều đường trung bình động (SMA và/hoặc EMA) chồng lên nến, mỗi đường tự chọn loại + chu kỳ + màu (mặc định SMA 20/50/200).
4. **RSI pane riêng** (mặc định 14) + **Multi-RSI**: nhiều đường RSI chu kỳ khác nhau trên cùng pane (vd 6/14/24) + vạch 30/70.
5. Lưu cấu hình indicator (localStorage + URL chia sẻ được) — **chưa cần tài khoản**.
6. Theme **Dark blue mặc định + Light**, mobile-first, đủ 4 trạng thái (tải/rỗng/lỗi/thành công).

**Should have:** giá vàng trong nước (SJC/BTMC/DOJI — bảng mua/bán + line chart) · cập nhật giá gần realtime (polling 60s hoặc Supabase Realtime) · badge "độ tươi dữ liệu" + cảnh báo khi nguồn stale.

**Could have:** thêm symbol (XAG, DXY, USD/VND) · MACD, Bollinger Bands · export CSV · so sánh vàng SJC vs thế giới quy đổi (cần tỷ giá USD/VND).

**Won't have (MVP):** tài khoản/đăng nhập · alerts đẩy thông báo · công cụ vẽ lên chart (trendline...) · app mobile · tin tức/phân tích.

> ✅ **Đã chốt (người dùng xác nhận khi chạy `/auto`):** "MA, SMA" = **Multi-MA** — nhiều đường SMA/EMA
> tự chọn chu kỳ + màu, chồng lên nến (song song với Multi-RSI). "Multi-RSI" = nhiều đường RSI chu kỳ
> khác nhau cùng một pane phụ.

## 4. Tech stack đề xuất (đã xác minh 2026-07-03)

Nền tảng giữ nguyên hồ sơ C1 của scaffold (đúng định hướng repo); phần **in đậm** là quyết định mới riêng cho Xgold.

| Vai trò           | Lựa chọn                                             | Phiên bản (xác minh 2026-07-03)        | Lý do (1 câu)                                                                                                                                           |
| ----------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime           | Node.js LTS "Jod"                                    | 22.x                                   | Khớp `.nvmrc` sẵn có + môi trường build thực tế; vẫn trong 3 dòng LTS song song đang hỗ trợ (đối chiếu lại lúc bootstrap thật — xem `PROJECT.md` mục 4) |
| Framework         | Next.js App Router                                   | 16.2.10                                | Full-stack một repo, SSR cho SEO trang giá                                                                                                              |
| UI                | React                                                | 19.2.7                                 | Đi cùng Next 16                                                                                                                                         |
| Ngôn ngữ          | TypeScript `strict`                                  | 6.0.3                                  | An toàn kiểu                                                                                                                                            |
| CSS               | Tailwind CSS                                         | 4.3.2                                  | Tokens hợp `styles/theme.css`                                                                                                                           |
| CSDL + Realtime   | Supabase (Postgres)                                  | `@supabase/supabase-js` 2.110.0        | Postgres chuẩn + RLS + Realtime + Edge Functions + pg_cron free                                                                                         |
| **Chart**         | **lightweight-charts (TradingView)**                 | **5.2.0**                              | Apache-2.0, chính chủ TradingView, v5 hỗ trợ **multi-pane** (cần cho RSI pane)                                                                          |
| **Indicator**     | **Tự viết `lib/indicators/` (pure TS)**              | —                                      | SMA/EMA/RSI ~vài chục dòng; thư viện `technicalindicators` **ngừng cập nhật từ 2020** — không dùng                                                      |
| **Nguồn XAU/USD** | **Twelve Data (chính) + Stooq CSV (backfill daily)** | free tier 800 credits/ngày, 8 req/phút | Đủ intraday 1h + quote 5 phút; Stooq cho lịch sử daily dài, không cần key                                                                               |
| **Ingestion**     | **Supabase Edge Function + pg_cron/pg_net**          | —                                      | Free, lịch tới từng phút; Vercel Cron gói Hobby **chỉ chạy 1 lần/ngày** — không đủ                                                                      |
| Validate          | Zod                                                  | 4.4.3                                  | Validate response provider + input                                                                                                                      |
| Hosting           | Vercel (app) + Supabase (data)                       | —                                      | Free tier đủ MVP; Preview = staging                                                                                                                     |
| Test              | Vitest 4.1.9 · @playwright/test 1.61.1               | —                                      | Unit indicator + E2E luồng chart                                                                                                                        |
| Observability     | Sentry `@sentry/nextjs` + bảng `ingest_runs`         | —                                      | Lỗi UI + sức khỏe ingestion                                                                                                                             |

### Ma trận chọn thư viện chart (quyết định lớn → ADR 0002)

| Tiêu chí                | lightweight-charts 5.2.0 | TradingView Advanced Charts                | ECharts 6.1.0                 | klinecharts 10.0.0-beta3               |
| ----------------------- | ------------------------ | ------------------------------------------ | ----------------------------- | -------------------------------------- |
| Chuyên chart tài chính  | ✅ chính chủ TradingView | ✅ đầy đủ nhất                             | ⚠️ tổng quát, tự dựng nhiều   | ✅                                     |
| License                 | ✅ Apache-2.0            | ❌ closed-source, phải đăng ký & chờ duyệt | ✅ Apache-2.0                 | ✅ Apache-2.0                          |
| Multi-pane cho RSI      | ✅ từ v5                 | ✅                                         | ⚠️ grid tự dựng               | ✅                                     |
| Độ phổ biến / cộng đồng | ✅ rất lớn               | ✅                                         | ✅ lớn (không chuyên finance) | ⚠️ nhỏ hơn                             |
| Phiên bản ổn định       | ✅ 5.2.0 stable          | —                                          | ✅                            | ❌ **đang beta** (vi phạm quy tắc §B4) |
| Kích thước bundle       | ✅ ~45KB                 | ❌ nặng                                    | ❌ nặng hơn nhiều             | ✅                                     |
| **Kết luận**            | **CHỌN**                 | Sau này nếu cần drawing tools              | Không                         | Không (beta)                           |

### Ma trận nguồn dữ liệu XAU/USD (quyết định lớn → ADR 0003)

| Tiêu chí              | Twelve Data                       | Stooq                      | Alpha Vantage   | Metals-API / GoldAPI | Yahoo Finance         |
| --------------------- | --------------------------------- | -------------------------- | --------------- | -------------------- | --------------------- |
| XAU/USD OHLC intraday | ✅ 1min–1month                    | ⚠️ daily là chính          | ⚠️              | ❌ chỉ spot          | ✅ (GC=F)             |
| Free tier             | ✅ 800 credits/ngày, 8/phút       | ✅ không cần key           | ❌ ~25 req/ngày | ❌ ~50–100 req/tháng | ⚠️                    |
| Chính thống / ổn định | ✅ API chính thức                 | ✅ lâu đời                 | ✅              | ✅                   | ❌ unofficial, dễ gãy |
| **Vai trò**           | **Nguồn chính (quote + 1h + 1D)** | **Backfill lịch sử daily** | Không           | Không                | Không                 |

> Thiết kế **adapter pattern** (`lib/providers/`): mỗi nguồn một adapter cùng interface → đổi/thêm nguồn không đụng phần còn lại; cột `source` ghi rõ xuất xứ từng dòng dữ liệu.

**Ngân sách credits Twelve Data (ước tính):** quote mỗi 5 phút (~288/ngày) + nến 1h mỗi giờ (~24/ngày) + nến 1D 1 lần/ngày ≈ **~315/800 credits** — dư địa an toàn.

**Nguồn giá vàng trong nước (đợt Should):** BTMC có API chính thức; vang.today free không cần key (cập nhật ~5 phút); SJC có feed XML (hay đổi cấu trúc). ⚠️ _Sandbox hiện tại chặn truy cập trực tiếp các domain này — cần xác minh endpoint thực tế ở bước triển khai đợt 5._

### Lưu time-series: Postgres thuần, KHÔNG Timescale (→ ADR 0004)

- Khối lượng nhỏ: nến 1h ≈ 6.200 dòng/năm/symbol; 5 năm daily ≈ 1.300 dòng — Postgres thuần dư sức.
- TimescaleDB **đã deprecated trên Supabase Postgres 17** → tránh hẳn.
- Resample 4h/1W bằng SQL (`date_trunc` + aggregate) hoặc client-side từ 1h/1D.

## 5. Kiến trúc & mô hình dữ liệu (phác thảo cho PROJECT.md mục 5–6)

```
[pg_cron (mỗi 5–60 phút)] → pg_net → [Edge Function ingest-gold]
      → fetch Twelve Data (Zod validate) → UPSERT candles → ghi ingest_runs

[Next.js 16 App Router] — SSR trang chủ (giá mới nhất, SEO)
      → đọc candles qua Supabase anon (RLS: chỉ SELECT)
      → <GoldChart> ('use client', lightweight-charts v5)
           ├─ pane 0: nến + SMA/EMA overlays
           └─ pane 1: RSI / Multi-RSI + vạch 30/70
      → indicator tính client-side bằng lib/indicators (pure TS, có unit test)
```

Bảng chính (migration có phiên bản, rollback được):

- `instruments(id, symbol, name, type, currency, source_config jsonb)`
- `candles(instrument_id, timeframe, ts timestamptz, open numeric, high numeric, low numeric, close numeric, volume numeric null, source text, PRIMARY KEY (instrument_id, timeframe, ts))` — **numeric, không float** (tiền không dùng float); CHECK `high >= low`.
- `ingest_runs(id, instrument_id, provider, timeframe, started_at, finished_at, status, rows_upserted, error text)`
- (Đợt 5) `domestic_gold_prices(id, vendor, product, buy numeric, sell numeric, ts timestamptz, source)`

RLS: anon **chỉ SELECT**; ghi chỉ qua `service_role` (Edge Function). Khóa API provider để trong **Edge Function secrets**, không bao giờ ở client.

## 6. Lộ trình từng bước (mỗi đợt = 1 nhánh + 1 PR qua `/gate`)

| Đợt                                                                 | Nội dung                                                                                                                                                                                                                                                                                                                             | Cổng ra (Definition of Done của đợt)                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **0. Chốt & dựng nền** ✅ _(đã chốt — đang triển khai qua `/auto`)_ | Điền `PROJECT.md` + ADR 0002–0004 → bootstrap: `package.json` (Node 22.x LTS, Next 16.2.10, TS 6, Tailwind 4), CI xanh, husky/lint-staged chạy                                                                                                                                                                                       | `npm run build/lint/type-check/test` đều đạt trên CI                                               |
| **1. Nền dữ liệu**                                                  | Migrations + RLS + seed XAU/USD; adapter Twelve Data + Stooq; script backfill ≥ 5 năm daily + 1 tháng 1h; Edge Function `ingest-gold` + lịch pg_cron; sanity checks (high≥low, không trùng, phát hiện gap)                                                                                                                           | DB có dữ liệu thật; ingest chạy tự động 24h không lỗi; `ingest_runs` ghi nhận đủ                   |
| **2. Chart cơ bản**                                                 | Trang `/chart/xauusd`: nến lightweight-charts, zoom/pan, chuyển khung 1h/4h/1D/1W (resample), 4 trạng thái UI, theme dark/light đồng bộ chart, mobile-first                                                                                                                                                                          | E2E mở chart thấy nến thật; Lighthouse đạt ngưỡng; AA cả 2 theme                                   |
| **3. Indicators (trọng tâm yêu cầu)**                               | `lib/indicators/`: SMA, EMA, RSI (unit test đối chiếu giá trị chuẩn TradingView/TA-Lib, đủ ca biên: mảng ngắn hơn chu kỳ, giá đứng yên → RSI 100/50, NaN đầu chuỗi); **Multi-MA overlay** (nhiều đường SMA/EMA, pane giá); **RSI pane + Multi-RSI** (pane phụ); panel cấu hình (thêm/xóa đường, chu kỳ, màu); lưu localStorage + URL | Giá trị indicator khớp tham chiếu (sai số < 0.01%); test xanh 100%; cấu hình giữ nguyên sau reload |
| **4. Hoàn thiện MVP**                                               | E2E đầy đủ luồng chính, axe/a11y, Sentry, docs (README + runbook vận hành ingest), deploy production Vercel + Supabase                                                                                                                                                                                                               | Cổng merge KHUNG-2 đạt toàn bộ; smoke test production                                              |
| **5. (Should) Vàng trong nước + realtime**                          | Xác minh & tích hợp nguồn SJC/BTMC/vang.today; bảng + line chart mua–bán; polling/Realtime; freshness badge                                                                                                                                                                                                                          | Nguồn chạy ổn 48h; xử lý nguồn chết không sập trang                                                |

Sau MVP (backlog): thêm symbol, MACD/Bollinger, alerts (cần account), export CSV, so sánh SJC vs thế giới quy đổi.

## 7. Góp ý chủ động (KHUNG-3 PHẦN A — điểm nổi bật)

1. **Múi giờ & ranh giới nến** — chỗ dễ sai nhất của app tài chính: lưu UTC (`timestamptz`); nến 1D theo quy ước nguồn (thị trường vàng spot đóng nến ~17:00 New York); hiển thị theo `Asia/Ho_Chi_Minh`. Ghi quy ước vào docs + test.
2. **Gap cuối tuần:** vàng spot nghỉ T7–CN — chart không được vẽ "khoảng trống giả"; kiểm tra hành vi lightweight-charts với dữ liệu thiếu ngày.
3. **Pháp lý/ToS dữ liệu:** free tier Twelve Data dùng cá nhân; nếu sau này công khai rộng/thương mại → xem lại license dữ liệu, thêm attribution. Trang nên có disclaimer "không phải lời khuyên đầu tư".
4. **Resilience ingestion:** retry + exponential backoff, upsert idempotent (chạy lại không nhân đôi), cảnh báo stale (> 2× chu kỳ thu thập) — hiển thị trên UI thay vì im lặng.
5. **Precision:** DB dùng `numeric`; tính indicator bằng double phía client là đủ cho hiển thị (không phải tiền giao dịch), nhưng **so sánh/lưu trữ giá luôn từ numeric**.
6. **SEO:** SSR trang chủ với giá mới nhất + `generateMetadata` — Xgold có thể kéo traffic tìm "giá vàng hôm nay" (lợi thế nội dung động).
7. **Chi phí tương lai:** điểm nghẽn đầu tiên là credits Twelve Data khi thêm symbol/khung nhỏ hơn — adapter pattern đã chừa đường thêm provider hoặc nâng gói.
8. **i18n:** scaffold có sẵn `i18n/` + `messages/` — MVP tiếng Việt, chừa khóa dịch ngay từ đầu để thêm EN rẻ.

## 8. Rủi ro chính & cách kiểm chứng sớm

| Rủi ro                                                 | Mức         | Kiểm chứng                                                                          |
| ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| Free tier Twelve Data đổi điều khoản/giới hạn          | Trung bình  | Đăng ký key, gọi thử XAU/USD 1h + quote ngay đợt 1                                  |
| Nguồn vàng trong nước không ổn định (SJC đổi cấu trúc) | Cao (đợt 5) | Adapter riêng + fallback đa nguồn (BTMC, vang.today); coi là Should, không chặn MVP |
| Resample 4h/1W sai ranh giới giờ                       | Trung bình  | Unit test resample với dữ liệu mẫu cố định                                          |
| lightweight-charts v5 API panes còn mới                | Thấp        | Prototype pane RSI ngay đầu đợt 3                                                   |

## 9. Đã chốt (qua `/auto`, 2026-07-03)

1. ✅ Phạm vi "vàng": MVP chỉ XAU/USD thế giới, vàng trong nước hoãn sang đợt 5.
2. ✅ "MA, SMA" = **Multi-MA** (nhiều đường SMA/EMA); **Multi-RSI** = nhiều đường RSI cùng pane.
3. ✅ Khung nhỏ nhất **1h** (+ 4h/1D/1W resample).
4. ✅ **Twelve Data** làm nguồn chính — cần đăng ký key miễn phí tại twelvedata.com trước khi Đợt 1 deploy thật (chưa cần cho việc code/test bằng fixture).
5. ✅ Không đăng nhập/tài khoản ở MVP (cấu hình lưu localStorage + URL).
6. ✅ Free tier (Vercel Hobby + Supabase Free) lúc đầu.

> Kế hoạch thực thi chi tiết (kiến trúc, trình tự đợt, rủi ro môi trường sandbox) đã được trình bày và
> duyệt qua Plan Mode ở phiên bootstrap; nội dung cốt lõi được phản ánh vào mục 4–8 ở trên,
> `PROJECT.md`, và tiến độ theo dõi tại `PROGRESS.md`.
