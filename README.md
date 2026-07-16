# Xgold

Web app theo dõi giá kim loại quý (vàng XAU/USD, bạc XAG/USD) với chart nến kiểu TradingView — thu
thập dữ liệu vào Postgres (Supabase), hiển thị bằng
[lightweight-charts](https://tradingview.github.io/lightweight-charts/) kèm bộ chỉ báo kỹ thuật:
**Multi-MA** (nhiều đường SMA/EMA), **Multi-RSI**, **MACD**, **Bollinger Bands**, và **gợi ý phân
tích kết hợp** (tín hiệu Mua/Bán/Trung lập tham khảo). Cấu hình lưu localStorage + chia sẻ qua URL.

> Đặc tả đầy đủ (vấn đề, MVP, schema, kiến trúc, DoD): [`PROJECT.md`](./PROJECT.md).
> Quyết định kỹ thuật lớn: [`docs/adr/`](./docs/adr/) (chart lib, nguồn dữ liệu, lưu trữ time-series...).
> Trạng thái/tiến độ hiện tại: [`PROGRESS.md`](./PROGRESS.md).

## Tính năng

- Chart nến **đa mã** (XAU/USD, XAG/USD — thêm mã mới chỉ cần một mục trong registry
  `lib/instruments.ts`), đủ dải khung kiểu TradingView 5m/15m/30m/1h/4h/1D/1W/1M (khung không phải cơ sở tính từ 5m/1h/1D lúc đọc, không lưu trùng lặp).
  Route động `/chart/[symbol]`, chuyển mã ngay trên trang qua SymbolSwitcher.
- **Multi-MA:** nhiều đường trung bình động (SMA hoặc EMA), mỗi đường tự chọn chu kỳ + màu, chồng
  lên nến.
- **Multi-RSI:** nhiều đường RSI (Wilder smoothing) chu kỳ khác nhau trên cùng một pane phụ, kèm 2
  vạch ngưỡng 30/70.
- **MACD + Bollinger Bands** và **gợi ý phân tích kết hợp** (engine `lib/analysis/` rule-based, tất
  định, có disclaimer — tín hiệu kỹ thuật tham khảo, không phải lời khuyên đầu tư).
- Cấu hình chỉ báo lưu `localStorage` + đồng bộ URL (`?cfg=...`) — chia sẻ được, không cần tài khoản.
- Theme **Dark blue** mặc định + **Light**, mobile-first, WCAG AA cả hai chế độ.
- Chạy được ngay cả khi **chưa cấu hình Supabase** — tự chuyển sang dữ liệu mẫu có gắn nhãn rõ ràng
  trên UI (không bao giờ giả là dữ liệu thật).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript `strict` 6 · Tailwind CSS 4 · Supabase (Postgres +
RLS + Edge Functions) · lightweight-charts 5 · Zod 4. Nguồn dữ liệu: Twelve Data (chính) + Stooq
(backfill lịch sử). Chi tiết lựa chọn + lý do: `docs/plans/xgold-mvp-plan.md`, `docs/adr/0001`–`0004`.

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:3000 — chạy được ngay, chưa cần cấu hình gì (dùng dữ liệu mẫu)
```

Muốn dùng dữ liệu thật, tạo `.env.local` (xem `.env.example`) với:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Sau đó: áp migration (`supabase/migrations/`) lên project Supabase, backfill lịch sử
(`npm run backfill` — cần thêm `SUPABASE_SERVICE_ROLE_KEY` + `TWELVEDATA_API_KEY`), và deploy Edge
Function `supabase/functions/ingest-gold/` để cập nhật định kỳ (xem README trong thư mục đó).

## Lệnh hay dùng

| Lệnh                                                     | Việc gì                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `npm run dev`                                            | Dev server (Turbopack)                                   |
| `npm run build` / `npm run start`                        | Build & chạy bản production                              |
| `npm run lint` / `npm run type-check` / `npm run format` | Cổng chất lượng (0 cảnh báo)                             |
| `npm run test` / `npm run test:coverage`                 | Unit test (Vitest)                                       |
| `npm run test:e2e`                                       | E2E (Playwright + axe)                                   |
| `npm run backfill`                                       | Backfill lịch sử giá từ Twelve Data + Stooq vào Supabase |

## Cấu trúc thư mục

```
app/                    Route Next.js (App Router) — trang chủ, /chart/[symbol] (đa mã), /api/candles
components/chart/       GoldChart (lightweight-charts), IndicatorPanel, SymbolSwitcher, TimeframeSwitcher, hooks
lib/instruments.ts      Registry mã (nguồn sự thật đa symbol: XAU/USD, XAG/USD) — slug/label/dữ liệu mẫu
lib/indicators/         SMA, EMA, RSI, MACD, Bollinger (pure TS, test đối chiếu giá trị tính tay) + cấu hình chỉ báo
lib/analysis/           Engine phân tích kết hợp (rule-based) → gợi ý Mua/Bán/Trung lập + backtest mô tả
lib/providers/          Adapter nguồn dữ liệu (Twelve Data, Stooq) — pattern chung, dễ thêm nguồn
lib/candles/            Kiểu dữ liệu nến dùng chung + resample (1h→4h, 1D→1W)
lib/fixtures/           Dữ liệu mẫu đa mã (dev/demo khi chưa cấu hình Supabase) + generator dùng chung
lib/supabase/           Client Supabase (chỉ đọc) + kiểu Database viết tay khớp migration
supabase/migrations/    Schema CSDL có phiên bản (instruments, candles, ingest_runs — RLS bật)
supabase/functions/     Edge Function ingest-gold (Deno) — thu thập định kỳ qua pg_cron
scripts/backfill.ts     Script backfill lịch sử chạy tay (npm run backfill)
e2e/                    Playwright E2E (chart, indicators, smoke) + quét a11y axe
docs/                   PROJECT.md liên quan, ADR, kế hoạch MVP, tài liệu khung phát triển (docs/framework/)
```

## Quy ước phát triển

Dự án này dùng khung quản lý dự án bằng AI (Claude Code) — quy trình giai đoạn, cổng commit/merge,
ADR, chống ảo giác... xem [`CLAUDE.md`](./CLAUDE.md). Tài liệu khung chi tiết ở `docs/framework/`
(tham khảo khi cần, không bắt buộc đọc để chạy dự án).

## Giấy phép

Xem [`LICENSE`](./LICENSE).
