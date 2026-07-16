# FEATURE-MAP — Bản đồ tính năng (đặc tả chi tiết)

> Nguồn sự thật về "dự án Xgold này CÓ NHỮNG GÌ". Cập nhật khi thêm/bỏ tính năng.
> Trạng thái: ✅ ổn · ⚠️ nghi ngờ (có phát hiện audit) · 🚧 dở dang.
> Lập lại bằng cách đọc code thật (`app/`, `components/`, `lib/`, `supabase/`) ngày **2026-07-16**
> (bản trước lập 2026-07-03, thiếu toàn bộ Đợt 6–14). Đây là đặc tả sống — không chỉ liệt kê, mà mô
> tả đủ để hiểu tính năng làm gì, dựa trên module nào, điểm mạnh cần giữ khi mở rộng.

## Điểm mạnh kiến trúc cần GIỮ NGUYÊN khi phát triển tiếp

Đây là các quyết định đã chứng minh đúng qua 14 đợt phát triển — không phá khi thêm tính năng mới:

- **Engine chỉ báo + phân tích thuần TypeScript, không dependency ngoài** (ADR-0007): `lib/indicators/*`
  và `lib/analysis/*` chỉ nhận `Candle[]` + tham số, trả điểm dữ liệu thuần — dễ unit test bằng giá trị
  tính tay, không phụ thuộc DOM/canvas. Mọi indicator mới (Ichimoku, ATR) đều theo đúng khuôn này.
- **Rule engine đồng nhất interface** (`lib/analysis/rules/*.ts`): mỗi rule là một hàm
  `evaluateX(inputs: AnalysisInputs, index: number, params): RuleVerdict` — thêm rule mới (đã làm 7 lần:
  ma-cross, cross, price-vs-ma, macd-cross, bb-touch, rsi-zone, rsi-stack, ichimoku-cloud) không phải sửa
  `combine.ts`, chỉ đăng ký thêm. **Giữ nguyên khuôn này cho rule Đợt 15+ (nếu có).**
  - Lưu ý một ngoại lệ đã biết (F-018): khi thiếu dữ liệu cloud/ATR, `trade-levels.ts` trả `confidence`
    có giá trị nhưng `entry/sl/tp1/tp2` là `null` — không đúng docstring "mọi trường null khi thiếu dữ
    liệu". UI tiêu thụ giá trị này cần xử lý rõ ràng ca này (xem F-012).
- **Adapter nguồn dữ liệu ngoài tách biệt provider quốc tế/trong nước** (`lib/providers/` vs
  `lib/providers-domestic/`) — cùng pattern interface `{name, fetchX()}`, Zod validate response, lỗi qua
  `ProviderError`. Thêm nguồn dữ liệu mới (sàn khác, kim loại khác) chỉ cần 1 file mới đúng khuôn.
- **Zod tại MỌI ranh giới**: query param API, response Supabase (`z.coerce.number()` — chốt sau F-009),
  cấu hình từ URL/localStorage (`?cfg=`). Không có ranh giới nào bỏ qua bước này kể từ khi vá F-009.
- **Hook fetch đồng nhất `{status, data, source, error}`** cho mọi tính năng lấy dữ liệu (`use-candles`,
  `use-domestic-gold`, `use-screener`, `use-confluence`, `use-gold-compare`) — UI luôn có đủ 4 trạng thái
  render tương ứng.
- **Kiến trúc điều phối 3 tầng** (`docs/framework/three-tier-orchestration.md`, `.claude/agents/`): tách
  lập kế hoạch (phiên chính) khỏi thực thi (coordinator + workers theo `route:`) — dùng khi việc đủ lớn
  để chia nhiều subagent, không dùng cho việc nhỏ một phiên làm xong.

## Bảng tính năng

| ID        | Tính năng / luồng                                                      | Điểm vào                                                                                       | Dữ liệu đụng tới                                          | Trạng thái                          | Test hiện có                                                                                                          |
| --------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| FT-01     | Trang chủ                                                              | `app/page.tsx`                                                                                 | –                                                         | ✅                                  | `e2e/smoke.spec.ts`                                                                                                   |
| FT-02     | Chart đa mã (XAU/USD, XAG/USD, DXY, USD/VND — 8 khung 5m→1M)           | `app/chart/[symbol]/*`, `GET /api/candles`                                                     | `instruments`, `candles`, `lib/instruments.ts`            | ✅                                  | `e2e/chart.spec.ts`, `e2e/multi-symbol.spec.ts`, `e2e/dxy-usdvnd.spec.ts`, `lib/candles/resample.test.ts`             |
| FT-03     | Multi-MA (nhiều đường SMA/EMA)                                         | `indicator-panel.tsx` + `gold-chart.tsx` (pane 0)                                              | `ChartConfig` (URL/localStorage)                          | ✅                                  | `lib/indicators/{sma,ema}.test.ts`, `e2e/indicators.spec.ts`                                                          |
| FT-04     | Multi-RSI (nhiều đường RSI, pane phụ)                                  | `indicator-panel.tsx` + `gold-chart.tsx` (pane 1)                                              | như trên                                                  | ✅                                  | `lib/indicators/rsi.test.ts`, `e2e/indicators.spec.ts`                                                                |
| FT-05     | Chia sẻ cấu hình chỉ báo qua URL (Zod-validated)                       | `lib/indicators/config.ts` (`?cfg=`)                                                           | base64 + localStorage                                     | ✅                                  | `lib/indicators/config.test.ts`, `e2e/indicators.spec.ts`                                                             |
| FT-06     | Đổi theme Dark blue / Light                                            | `components/theme-toggle.tsx`                                                                  | `localStorage`                                            | ✅                                  | `theme-toggle.test.tsx`, `e2e/chart.spec.ts`                                                                          |
| FT-07     | Giá vàng trong nước (BTMC)                                             | `/gia-vang-trong-nuoc`, `GET /api/domestic-gold`                                               | `domestic_gold_prices`                                    | ✅ (lib) / ⚠️ (UI 0% coverage)      | `e2e/domestic-gold.spec.ts`, `freshness.test.ts`; `page-client.tsx` 0% coverage (F-014)                               |
| FT-08     | Badge độ tươi dữ liệu (fresh/stale)                                    | `freshness-badge.tsx`                                                                          | `ts` mới nhất `domestic_gold_prices`                      | ✅                                  | `freshness.test.ts`                                                                                                   |
| FT-09/10  | Ingestion + backfill XAU/USD (nền, chạy tay)                           | Edge Function `ingest-gold`, `scripts/backfill.ts`                                             | Twelve Data/Stooq → `candles`, `ingest_runs`              | 🚧                                  | Chưa chạy thật (mạng sandbox chặn) — nợ kỹ thuật đã biết, chờ deploy Supabase thật                                    |
| FT-11     | Ingestion giá vàng trong nước (nền)                                    | Edge Function `ingest-domestic-gold`                                                           | BTMC XML → `domestic_gold_prices`                         | 🚧                                  | 8 unit test adapter; Edge Function chưa chạy thật                                                                     |
| FT-12     | Trang lỗi / 404                                                        | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`                                   | –                                                         | ✅                                  | scaffold Next.js chuẩn, không test riêng                                                                              |
| FT-13     | Metadata SEO cơ bản                                                    | `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`                                           | –                                                         | ⚠️                                  | không test; icon manifest chưa có ảnh thật (F-008, nợ kỹ thuật có chủ đích)                                           |
| FT-14     | MACD + Bollinger Bands trên chart                                      | `indicator-panel.tsx` + `gold-chart.tsx`                                                       | `ChartConfig`                                             | ✅                                  | `macd.test.ts`, `bollinger.test.ts`, `e2e/indicators.spec.ts`                                                         |
| FT-15     | Engine phân tích kết hợp (7 rule) + markers Mua/Bán                    | `analysis-panel.tsx`, `lib/analysis/{rules,combine}.ts`                                        | `ChartConfig.analysis`                                    | ✅ (lib) / ⚠️ (UI 0% coverage)      | `rules.test.ts`, `combine.test.ts`, `e2e/analysis.spec.ts`; `analysis-panel.tsx` 0% (F-012)                           |
| FT-16     | Thống kê tín hiệu lịch sử (chạy tay)                                   | `scripts/signal-stats.ts`                                                                      | fixtures                                                  | ✅                                  | `backtest.test.ts`                                                                                                    |
| FT-17     | Chuyển mã (SymbolSwitcher)                                             | `symbol-switcher.tsx`                                                                          | `lib/instruments.ts`                                      | ✅                                  | `e2e/multi-symbol.spec.ts`                                                                                            |
| FT-18     | Quét tín hiệu (Screener) — mọi mã, 1 khung chọn được                   | `/quet-tin-hieu`, `use-screener.ts`                                                            | `/api/candles` mọi mã, `DEFAULT_ANALYSIS_CONFIG`          | ✅                                  | `use-screener.test.ts`, `e2e/screener.spec.ts`                                                                        |
| FT-19     | Hợp lưu tín hiệu đa khung (MTF confluence)                             | `use-confluence.ts`, `confluence-panel.tsx`                                                    | `lib/analysis/multi-timeframe.ts`, `/api/candles` (1h+1D) | ✅                                  | `multi-timeframe.test.ts`, `use-confluence.test.ts`, `e2e/confluence.spec.ts`                                         |
| FT-20     | Tỷ lệ Vàng/Bạc + tương quan XAU/DXY                                    | `market-context.tsx`, `lib/analysis/ratio.ts`                                                  | nến 1D XAU/XAG/DXY                                        | ✅                                  | `ratio.test.ts`, `e2e/screener.spec.ts`                                                                               |
| **FT-21** | **Mây Ichimoku (overlay + rule R6, ADR-0011)**                         | `lib/indicators/ichimoku.ts`, `lib/analysis/rules/ichimoku-cloud.ts`, `gold-chart.tsx`         | `ChartConfig.ichimoku`                                    | ✅                                  | `ichimoku.test.ts`, phần R6 trong `rules.test.ts`                                                                     |
| **FT-22** | **RSI-stack rule R7 (10/14/21 xếp lớp)**                               | `lib/analysis/rules/rsi-stack.ts`                                                              | `AnalysisInputs.rsiFast/rsi/rsiSlow`                      | ✅                                  | phần R7 trong `rules.test.ts`                                                                                         |
| **FT-23** | **Entry/SL/TP + Confidence/Risk (trade-levels, ADR-0011)**             | `lib/analysis/trade-levels.ts`, hiển thị trong `analysis-panel.tsx`                            | Ichimoku cloud + ATR14 + RSI stack                        | ✅ (lib, 97% coverage) / ⚠️ (UI 0%) | `trade-levels.test.ts`; xem lưu ý F-018 + F-012                                                                       |
| **FT-24** | **DXY (chỉ số USD) + USD/VND làm symbol phụ trợ (ADR-0009)**           | `lib/instruments.ts`, migration `20260705070000`                                               | `instruments`, `candles`                                  | ✅                                  | `e2e/dxy-usdvnd.spec.ts`                                                                                              |
| **FT-25** | **So sánh giá vàng SJC vs quốc tế quy đổi**                            | `/so-sanh-gia-vang`, `use-gold-compare.ts`, `compare-table.tsx`, `lib/gold-compare/convert.ts` | domestic + XAUUSD + tỷ giá USD/VND                        | ✅ (hook) / ⚠️ (UI 0%)              | `use-gold-compare.test.ts`, `convert.test.ts`, `e2e/gold-compare.spec.ts`; UI 0% coverage (F-013)                     |
| **FT-26** | **Dải khung thời gian đầy đủ 5m/15m/30m/1h/4h/1D/1W/1M (ADR, Đợt 12)** | `lib/candles/resample.ts`, `lib/candles/types.ts`, migration `20260716080000`                  | resample từ khung cơ sở 5m/1h/1D                          | ✅                                  | `resample.test.ts` (96.77% stmt — nhánh `default` dòng 43 chưa phủ, F-020)                                            |
| **FT-27** | **Volume overlay + Legend OHLC kiểu TradingView (Đợt 13)**             | `lib/candles/legend.ts`, `gold-chart.tsx`                                                      | `Candle.volume`                                           | ✅                                  | `legend.test.ts`                                                                                                      |
| **FT-28** | **Xuất CSV nến (Đợt 14, PR #29)**                                      | `lib/candles/csv.ts`, nút "Xuất CSV" trong `chart-page-client.tsx`                             | `candles` hiện có trên chart                              | ⚠️                                  | `csv.test.ts` (100% cho module thuần); nút bấm chưa có E2E riêng + rủi ro `anchor.click()` chưa `appendChild` (F-011) |

## Luồng chính (bắt buộc có E2E — đối chiếu Definition of Complete)

- Xem chart một mã (4 mã: XAU/USD, XAG/USD, DXY, USD/VND), đổi 1 trong 8 khung thời gian, quan sát
  Multi-MA + Multi-RSI + MACD/Bollinger + Ichimoku cloud + Volume + Legend OHLC; chuyển mã qua
  SymbolSwitcher (FT-02, FT-03, FT-04, FT-14, FT-17, FT-21, FT-26, FT-27).
- Xem gợi ý phân tích kết hợp (Mua/Bán/Trung lập + lý do + Entry/SL/TP/Confidence/Risk + disclaimer),
  bật/tắt quy tắc, quan sát markers tín hiệu trên nến (FT-15, FT-21, FT-22, FT-23).
- Tùy biến chỉ báo và chia sẻ cấu hình qua URL (FT-05).
- Xuất dữ liệu nến ra CSV từ trang chart (FT-28).
- Xem giá vàng trong nước + độ tươi dữ liệu; so sánh SJC vs quốc tế quy đổi (FT-07, FT-08, FT-25).
- Đổi theme Dark blue ⇄ Light trên mọi trang, không vỡ layout/chart (FT-06).
- Xem panel hợp lưu tín hiệu đa khung bên dưới phân tích kết hợp trên trang chart (FT-19).
- Vào `/quet-tin-hieu`, đổi khung, quan sát bảng tín hiệu mọi mã + thẻ bối cảnh thị trường (FT-18, FT-20).
- (Khi có Supabase thật) Ingestion tự động cập nhật dữ liệu mới theo lịch (FT-09, FT-11) — luồng
  **chưa kiểm chứng được trong sandbox**, ưu tiên cao khi deploy thật.
