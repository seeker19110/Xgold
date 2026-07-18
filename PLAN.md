# PLAN.md — TradingView parity (Đợt 14–17)

> Hợp đồng giữa Tầng 1 (phiên chính, đã lập kế hoạch này) và Tầng 2 (`coordinator`).
> Coordinator thi hành **nguyên văn** file này — không đổi đặc tả/tiêu chí. Việc vướng đặc tả →
> dừng việc đó, báo lên phiên chính (không tự vá, không route lại để né).
> Nguồn: `docs/plans/xgold-tradingview-parity-plan.md` (đã duyệt toàn bộ Đợt 14→17, 2026-07-17) +
> `docs/adr/0012-drawing-tools-self-built-primitives.md` (ADR bắt buộc cho Đợt 16, đã viết).

## Quyết định của phiên chính trước khi giao việc (đọc trước khi thắc mắc)

1. **Đợt 16 (công cụ vẽ):** ADR-0012 đã chốt **tự viết Series Primitives**, không dùng gói cộng
   đồng (`lightweight-charts-drawing` pre-1.0/1 người bảo trì, `lightweight-charts-line-tools`
   không tương thích kiến trúc — xem ADR để biết chi tiết + bằng chứng npm registry).
2. **Đợt 17 (alerts):** không có Supabase thật để deploy (nợ kỹ thuật đã biết) → chọn **v1
   client-side** (Notification API, kiểm tra khi tab đang mở) thay vì chờ hạ tầng — đây là lựa chọn
   (b) đã nêu ở mục 7.2 của kế hoạch gốc. Nếu người dùng muốn hướng (a) (chờ deploy + auth), báo lại
   trước khi coordinator dispatch W-514.
3. **Watchlist (Đợt 15):** chỉ localStorage, không đồng bộ thiết bị — đúng mục 7.3 kế hoạch gốc.
4. Thứ tự thực thi: **14 → 15 → 16 → 17**, đúng đề xuất gốc (giá trị/công sức giảm dần, rủi ro tăng
   dần, Đợt 16 rủi ro cao nhất nên xếp gần cuối, Đợt 17 phụ thuộc ít nhất xếp cuối).

## Ràng buộc áp dụng cho MỌI việc dưới đây (không lặp lại trong từng dòng)

- Giữ nguyên kiến trúc: `lightweight-charts` 5.2.0 (ADR-0002), không đổi thư viện chart; pure TS
  cho mọi logic tính toán (ADR-0007) — hàm nhận dữ liệu thuần, không phụ thuộc DOM, dễ unit test
  giá trị tính tay.
- `ChartConfigSchema` (`lib/indicators/config.ts`) mọi khóa mới đều `.default(...)` — **tương thích
  ngược URL/localStorage cũ** (mẫu đã có ở `volume`/`macd`/`bollinger`/`ichimoku`/`analysis`).
- Mọi tính năng UI mới: đủ 4 trạng thái (loading/rỗng/error/success nếu có fetch), WCAG AA cả Dark
  blue/Light, vùng chạm ≥44px, `aria-label` phù hợp — đối chiếu `docs/CONVENTIONS.md`.
- Nhánh riêng mỗi việc (`feat/<id>-<mô-tả-ngắn>`), qua đúng cổng `/gate` (build/type-check/lint 0
  cảnh báo/format/test) trước khi coordinator gọi reviewer.
- Kiểm chứng THẬT bằng trình duyệt (không chỉ tin test) trước khi báo nghiệm thu — ảnh chụp cả 2
  theme cho việc có UI mới.
- Lighthouse không tụt dưới ngưỡng `lighthouserc.json` sau mỗi đợt (đặc biệt Đợt 16 — thêm JS cho
  primitives) — coordinator chạy lại `lhci autorun` thật sau khi tích hợp xong mỗi đợt.
- Cập nhật `docs/FEATURE-MAP.md` (thêm FT-29+) làm một phần của PR cho việc đó — không tách việc
  tài liệu riêng.
- Cập nhật `PROGRESS.md` mục "Đã xong"/"Đang làm" sau mỗi việc — coordinator ghi khi báo cáo.

---

## Đợt 14 — Kiểu chart + tiện ích thang giá

### W-501 — route: `standard`

**Mô tả:** Hàm thuần tính nến Heikin Ashi.

**Đặc tả:**

- File mới `lib/candles/heikin-ashi.ts`, export `toHeikinAshi(candles: readonly Candle[]): Candle[]`.
- Công thức chuẩn (khớp TradingView):
  - `haClose[i] = (open[i] + high[i] + low[i] + close[i]) / 4`
  - `haOpen[0] = (open[0] + close[0]) / 2`; `haOpen[i] = (haOpen[i-1] + haClose[i-1]) / 2` (i > 0)
  - `haHigh[i] = max(high[i], haOpen[i], haClose[i])`
  - `haLow[i] = min(low[i], haOpen[i], haClose[i])`
  - `volume`, `ts` giữ nguyên từ nến gốc (chỉ OHLC đổi).
- Input rỗng → trả `[]` (không throw).

**Tiêu chí nghiệm thu:**

- ≥4 unit test **giá trị tính tay** (không copy output của chính hàm đang test): dãy nến tăng liên
  tục, dãy giảm liên tục, dãy dao động (ít nhất 1 ca đảo chiều để lộ công thức `haOpen` đệ quy sai
  nếu có), input rỗng.
- `npm run test` xanh, coverage file mới ≥95% statement.

**Phụ thuộc:** không.

---

### W-502 — route: `complex`

**Mô tả:** Chọn kiểu chart (Nến / Heikin Ashi / Bar / Line / Area) — đổi được, giữ nguyên mọi
overlay (Multi-MA/RSI/MACD/BB/Ichimoku/Volume/markers/legend) hoạt động đúng qua mọi kiểu.

**Bối cảnh kỹ thuật (đọc trước khi code):** `gold-chart.tsx` hiện tại tạo **một lần** duy nhất
`CandlestickSeries` trong Effect 1 (dòng ~137), giữ ref kiểu `ISeriesApi<'Candlestick'>`
(`candleSeriesRef`). `createSeriesMarkers` (Effect 7) và legend OHLC (`legendAt`, dựa vào
`timeToIndexRef`) đều gắn vào series này. `lightweight-charts` **không cho đổi loại series tại
chỗ** — phải `chart.removeSeries()` series cũ + `chart.addSeries()` loại mới, rồi gắn lại markers
plugin vào series mới (plugin cũ mất theo series bị xóa).

**Đặc tả (khung, còn chỗ tự quyết cách refactor cụ thể):**

- `ChartConfigSchema` (`lib/indicators/config.ts`): thêm
  `chartType: z.enum(['candles', 'heikinAshi', 'bar', 'line', 'area']).default('candles')`.
  `DEFAULT_CHART_CONFIG.chartType = 'candles'`.
- `gold-chart.tsx`: khi `config.chartType` đổi, series chính phải đổi loại đúng
  (`CandlestickSeries`/`BarSeries`/`LineSeries`/`AreaSeries` từ `lightweight-charts` — đã xác nhận
  tồn tại trong `typings.d.ts` bản 5.2.0 đang cài; `heikinAshi` dùng lại `CandlestickSeries` nhưng
  `setData` bằng `toHeikinAshi(candles)` thay vì `candles` gốc, xem W-501).
  - Line/Area chỉ có 1 giá trị/nến (không phải OHLC) — dùng `close` của nến (hoặc HA close nếu
    kết hợp, nhưng v1 không bắt buộc kết hợp Line+HA — line/area luôn theo giá gốc).
  - Markers (Effect 7) và legend (dựa `timeToIndexRef`) phải **tiếp tục hoạt động đúng** sau khi
    đổi kiểu chart — bạn tự quyết cách tổ chức lại ref/effect để đạt được điều này (ví dụ: tách
    logic "series chính" thành 1 effect quản lý vòng đời series + set lại markers mỗi khi series
    đổi, hoặc giữ 1 ref kiểu union `ISeriesApi<SeriesType>`).
  - Volume overlay + mọi overlay khác (Effect 2b–6) **không đổi** — chúng độc lập với loại series
    chính, không cần sửa.
- UI: component mới `components/chart/chart-type-switcher.tsx` (dropdown hoặc nhóm nút, mẫu style
  giống `timeframe-switcher.tsx`), đặt cạnh `TimeframeSwitcher` trong
  `app/chart/[symbol]/chart-page-client.tsx`.

**Tiêu chí nghiệm thu:**

- Đổi qua đủ 5 kiểu chart, mỗi lần đổi: markers Mua/Bán vẫn hiển thị đúng vị trí, legend OHLC vẫn
  cập nhật đúng khi rê crosshair, Multi-MA/RSI/MACD/BB/Ichimoku/Volume không biến mất.
- Heikin Ashi hiển thị giá trị đúng (đối chiếu 1 nến bằng tay với `toHeikinAshi` output).
- `?cfg=` cũ (không có `chartType`) vẫn giải mã được, mặc định `candles` (test round-trip
  tương thích ngược, mẫu có sẵn ở `config.test.ts`).
- E2E mới: đổi qua ≥3 kiểu chart (candles/heikinAshi/line), chart không vỡ (canvas còn), markers
  vẫn còn sau khi đổi kiểu; axe 0 vi phạm cả 2 theme.
- Kiểm chứng thật bằng trình duyệt: screenshot mỗi kiểu chart, cả Dark blue + Light.

**Phụ thuộc:** W-501 (dùng `toHeikinAshi`).

---

### W-503 — route: `standard`

**Mô tả:** Thang giá Log/Linear + nút auto-fit (fit toàn bộ dữ liệu vào khung nhìn).

**Đặc tả:**

- `ChartConfigSchema`: thêm `priceScaleMode: z.enum(['normal', 'logarithmic']).default('normal')`.
- `gold-chart.tsx`: effect áp `priceScaleRef.current?.applyOptions({ mode: config.priceScaleMode === 'logarithmic' ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal })`
  (`PriceScaleMode` export từ `lightweight-charts`, đã xác nhận tồn tại — `Normal = 0`,
  `Logarithmic = 1`).
- Nút toggle Log/Linear cạnh `ChartTypeSwitcher` (W-502) hoặc `TimeframeSwitcher`.
- Nút "Auto fit" riêng: gọi `chart.timeScale().fitContent()` khi bấm (không tự động, chỉ khi
  người dùng chủ động bấm — tránh xung đột với hành vi fit tự động đã có ở Effect 2 khi đổi nến).

**Tiêu chí nghiệm thu:**

- Toggle Log/Linear đổi đúng thang giá (kiểm tra bằng mắt: khoảng cách giữa các mốc giá không đều
  ở chế độ log). Auto-fit đưa toàn bộ dữ liệu vào khung nhìn sau khi zoom/pan.
- `?cfg=` cũ vẫn giải mã được (`.default('normal')`).
- E2E: bật log scale không vỡ chart; axe 0 vi phạm.

**Phụ thuộc:** không (độc lập với W-502, có thể làm song song).

---

### W-504 — route: `standard`

**Mô tả:** Countdown nến hiện tại trong legend (thời gian còn lại tới khi nến đang mở đóng lại).

**Đặc tả:**

- File `lib/candles/legend.ts` (đã có `legendAt`) — thêm hàm thuần
  `candleCountdown(timeframe: Timeframe, latestCandleTs: string, now: Date): { label: string; secondsRemaining: number } | null`.
  - Tính mốc đóng nến kế tiếp từ `timeframe` (dùng `SOURCE_TIMEFRAME`/độ dài khung có sẵn ở
    `lib/candles/resample.ts` — không viết lại bảng tra cứu thời lượng khung, tái dùng nếu có, nếu
    chưa có hàm tra "độ dài khung tính bằng giây" thì thêm 1 hàm nhỏ `timeframeDurationSeconds`
    cùng file `resample.ts`).
  - `label` định dạng `mm:ss` (hoặc `hh:mm:ss` cho khung ≥1h) đếm ngược tới mốc đóng nến.
  - Trả `null` nếu không tính được (không có nến, timeframe không xác định) — không throw.
- `gold-chart.tsx`: hiển thị countdown trong legend overlay hiện có (cạnh O/H/L/C/%), cập nhật mỗi
  giây bằng `setInterval` trong component (dọn dẹp đúng khi unmount).

**Tiêu chí nghiệm thu:**

- Unit test **tính tay**: khung `1h`, nến mới nhất mở lúc `10:00:00Z`, `now = 10:15:30Z` →
  countdown phải ra đúng `44:30` còn lại (khớp tính tay: nến đóng lúc 11:00:00Z).
- Ca biên: `now` đúng bằng mốc đóng nến → `secondsRemaining = 0` (không âm).
- E2E: legend hiển thị countdown, không tăng CPU bất thường (không cần đo, chỉ xác nhận
  `setInterval` được `clearInterval` đúng khi đổi symbol/unmount — kiểm bằng test hoặc code review).

**Phụ thuộc:** không.

---

### W-505 — route: `standard`

**Mô tả:** Fullscreen chart + chụp ảnh chart (PNG).

**Đặc tả:**

- Fullscreen: dùng Fullscreen API chuẩn (`element.requestFullscreen()`/`document.exitFullscreen()`),
  áp lên container bọc `GoldChart` (không phải cả trang) — khi fullscreen, ẩn header/breadcrumb,
  chart tự giãn theo `autoSize: true` đã có sẵn. Có fallback nếu trình duyệt không hỗ trợ API
  (nút vẫn hiện nhưng bấm không có tác dụng — không throw, không crash).
- Chụp ảnh: nút gọi `chart.takeScreenshot()` (đã xác nhận tồn tại trong typings v5.2.0, trả về
  `HTMLCanvasElement`) → `canvas.toBlob()` → tải xuống qua `<a download>` (tái dùng đúng pattern
  `appendChild`/`click`/`removeChild` đã sửa ở F-011, xem `chart-page-client.tsx` hàm
  `handleExportCsv` làm mẫu — **không lặp lại lỗi cũ**, gọi `appendChild` trước `click()`).
  Tên file gợi ý: `<symbol>-<timeframe>-chart.png`.

**Tiêu chí nghiệm thu:**

- Bấm fullscreen → chart phóng to, bấm lại/Esc → thoát fullscreen, chart không vỡ layout.
- Bấm chụp ảnh → tải đúng file PNG, mở ra thấy đúng nội dung chart hiện tại (kiểm chứng thật bằng
  trình duyệt, không chỉ tin test).
- E2E: fullscreen toggle không lỗi console; nút chụp ảnh tồn tại và có thể bấm (E2E không cần xác
  nhận nội dung ảnh — làm bằng kiểm chứng thủ công thay vì automation cho phần này, theo đúng
  pattern đã dùng cho nút "Xuất CSV" ở Đợt 14 gốc/PR #29).

**Phụ thuộc:** không.

---

## Đợt 15 — Symbol search + watchlist + so sánh mã

### W-506 — route: `standard`

**Mô tả:** Hàm thuần chuẩn hóa chuỗi giá về % thay đổi so với nến đầu khung nhìn (cho so sánh mã).

**Đặc tả:**

- File mới `lib/candles/percent-normalize.ts`, export
  `normalizeToPercent(candles: readonly Candle[]): { ts: string; value: number }[]`.
  - `value[i] = (close[i] - close[0]) / close[0] * 100` (% thay đổi so với nến đầu tiên trong mảng
    truyền vào — "khung nhìn" do caller quyết định phạm vi mảng, hàm này không tự cắt dữ liệu).
  - `close[0] === 0` hoặc mảng rỗng → trả `[]` (không chia cho 0, không throw).

**Tiêu chí nghiệm thu:**

- Unit test tính tay: chuỗi giá `[100, 110, 90]` → `[0, 10, -10]` (%); ca `close[0] = 0` → `[]`;
  mảng rỗng → `[]`.

**Phụ thuộc:** không.

---

### W-507 — route: `complex`

**Mô tả:** So sánh mã (Compare) — overlay mã thứ 2 lên pane giá bằng thang %, tối đa 2 mã.

**Đặc tả (khung):**

- UI: nút "So sánh" trên `chart-page-client.tsx`, mở danh sách chọn mã từ `lib/instruments.ts`
  (loại trừ mã đang xem chính) — chỉ cho chọn **1 mã phụ** (tổng tối đa 2 mã trên chart, đúng giới
  hạn kế hoạch gốc).
- Khi chọn mã so sánh: fetch nến mã đó cùng `timeframe` hiện tại (`/api/candles`, tái dùng
  `use-candles` hoặc viết hook riêng theo cùng pattern `{status, data, source, error}`), chuẩn hóa
  cả 2 chuỗi (mã chính + mã phụ) bằng `normalizeToPercent` (W-506) trên đúng khung nhìn hiện có
  (toàn bộ mảng `candles` đang render — không phải chỉ phần hiển thị sau zoom, v1 đơn giản).
- `gold-chart.tsx`: thêm 1 `LineSeries` cho mã so sánh, **thang giá riêng** (không dùng chung thang
  với nến chính — nến chính vẫn hiển thị giá thật, đường so sánh hiển thị theo `priceScaleId` riêng
  dạng %). Bạn tự quyết cách tổ chức effect mới cho series này (theo mẫu các effect overlay khác đã
  có: BB/Ichimoku/MACD).
- Không lưu vào `ChartConfig`/URL ở v1 (trạng thái so sánh chỉ tồn tại trong phiên xem, mất khi
  reload) — quyết định phạm vi để giảm độ phức tạp, ghi rõ trong PR.

**Tiêu chí nghiệm thu:**

- Chọn mã so sánh → đường % hiện trên chart, thang riêng biệt không làm méo thang giá nến chính.
- Bỏ chọn → đường biến mất, không rò rỉ series (kiểm tra `chart.removeSeries` được gọi đúng khi
  unmount/đổi mã).
- E2E: chọn 1 mã so sánh, xác nhận 2 series cùng hiển thị; axe 0 vi phạm.
- Kiểm chứng thật bằng trình duyệt, screenshot cả 2 theme.

**Phụ thuộc:** W-506.

---

### W-508 — route: `standard`

**Mô tả:** Symbol search (hộp tìm nhanh, Ctrl+K hoặc nút 🔍).

**Đặc tả:**

- Component mới `components/chart/symbol-search.tsx`: modal/dialog mở bằng phím tắt `Ctrl+K`
  (hoặc `Cmd+K` trên Mac — dùng `metaKey || ctrlKey`) hoặc nút 🔍 cạnh `SymbolSwitcher`.
- Lọc `INSTRUMENTS` (từ `lib/instruments.ts`) theo `symbol`/`label`/`name` chứa chuỗi gõ vào
  (không phân biệt hoa/thường, không cần fuzzy-match phức tạp — `includes()` đủ cho v1 vì registry
  hiện chỉ 4 mã, nhưng viết hàm lọc tách riêng để mở rộng sau không phải sửa component).
- Chọn 1 kết quả (click hoặc Enter khi đã focus) → điều hướng `/chart/{slug}` (dùng `next/navigation`
  router, không phải `<a>` thường vì cần đóng modal trước khi chuyển trang).
- Đóng bằng `Esc` hoặc click ra ngoài. Focus trap cơ bản: mở modal → focus vào ô input ngay; đóng
  modal → trả focus về phần tử đã mở nó (nút 🔍).
- `SymbolSwitcher` (4 nút) **giữ nguyên, không xóa** — kế hoạch gốc nói rõ "thay dần khi registry
  lớn lên (giữ switcher cho ≤6 mã)"; symbol search là bổ sung, không thay thế ở v1.

**Tiêu chí nghiệm thu:**

- `Ctrl+K` mở modal từ bất kỳ đâu trên trang chart; gõ lọc đúng; Enter/click điều hướng đúng mã;
  `Esc` đóng modal.
- E2E: mở bằng phím tắt, lọc ra đúng 1 mã, chọn, xác nhận URL đổi đúng; axe 0 vi phạm (dialog có
  `role="dialog"` + `aria-modal="true"` + label).

**Phụ thuộc:** không.

---

### W-509 — route: `complex`

**Mô tả:** Watchlist — danh sách mã đã ghim, hiển thị giá/tín hiệu, lưu localStorage.

**Đặc tả (khung, còn chỗ tự quyết bố cục):**

- State: `lib/watchlist/types.ts` — Zod schema mảng `symbol: string` (danh sách mã đã ghim), lưu
  `localStorage` key `xgold:watchlist`. Hook `use-watchlist.ts` (đọc/ghi, pattern giống
  `use-indicator-config.ts` — bắt đầu rỗng khớp SSR, đọc thật sau mount).
- Dữ liệu giá/tín hiệu mỗi mã trong watchlist: **tái dùng logic của `use-screener.ts`**
  (`rowFromCandles`/`emptyRow` hoặc tách các hàm đó ra thành tiện ích dùng chung nếu hợp lý — tự
  quyết mức tái cấu trúc, miễn không phá `use-screener.test.ts` hiện có) — không viết lại logic
  tính giá/tín hiệu/RSI/trend từ đầu.
- UI: cột phải trên `chart-page-client.tsx` ở desktop (≥ breakpoint `md` Tailwind), sheet trượt lên
  từ dưới trên mobile (< `md`) — bạn tự quyết cơ chế mở/đóng sheet mobile (ví dụ: nút nổi + overlay).
  Mỗi dòng: mã, giá cuối, ±% (so với nến trước), tín hiệu (Mua/Bán/Trung lập), nút bỏ ghim; click
  dòng → điều hướng `/chart/{slug}`.
- Nút ghim/bỏ ghim đặt ở `chart-page-client.tsx` (header, cạnh tên mã) — ghim mã đang xem.

**Tiêu chí nghiệm thu:**

- Ghim mã → xuất hiện trong watchlist; reload trang → watchlist còn nguyên (sống sót qua
  localStorage); bỏ ghim → biến mất.
- Desktop: watchlist hiển thị cột phải không đè lên chart. Mobile (375px): sheet không chặn thao
  tác chính, vùng chạm ≥44px.
- E2E cả desktop + mobile viewport: ghim/bỏ ghim, reload giữ trạng thái, axe 0 vi phạm.
- Kiểm chứng thật bằng trình duyệt cả 2 theme + 2 viewport.

**Phụ thuộc:** không (độc lập, dùng lại logic `use-screener` nhưng không sửa hành vi hiện có của
Screener).

---

## Đợt 16 — Công cụ vẽ (ADR-0012 đã chốt: tự viết primitives)

> Rủi ro cao nhất kế hoạch — tách 3 việc, mỗi việc PR riêng. W-511 là phần khó nhất.

### W-510 — route: `spec`

**Mô tả:** Hạ tầng model dữ liệu công cụ vẽ (đặc tả kín — chỉ thi hành).

**Đặc tả (đầy đủ, không còn chỗ tự quyết):**

- File mới `lib/drawings/types.ts`:
  ```ts
  import { z } from 'zod';

  const PointSchema = z.object({ time: z.number().int(), price: z.number() });
  // `time` là UTCTimestamp (giây, khớp kiểu Time của lightweight-charts) — KHÔNG theo pixel, để
  // toạ độ sống sót qua zoom/pan/đổi timeframe (yêu cầu ADR-0012 + kế hoạch gốc mục 16.1).

  export const HorizontalLineDrawingSchema = z.object({
    id: z.string(),
    type: z.literal('horizontal-line'),
    price: z.number(),
    color: z.string(),
  });

  export const TrendlineDrawingSchema = z.object({
    id: z.string(),
    type: z.literal('trendline'),
    p1: PointSchema,
    p2: PointSchema,
    color: z.string(),
  });

  export const FibRetracementDrawingSchema = z.object({
    id: z.string(),
    type: z.literal('fib-retracement'),
    p1: PointSchema,
    p2: PointSchema,
  });

  export const DrawingSchema = z.discriminatedUnion('type', [
    HorizontalLineDrawingSchema,
    TrendlineDrawingSchema,
    FibRetracementDrawingSchema,
  ]);
  export type Drawing = z.infer<typeof DrawingSchema>;

  export const DrawingsStateSchema = z.array(DrawingSchema);
  ```
- File mới `lib/drawings/storage.ts`:
  - `loadDrawings(symbol: string): Drawing[]` — đọc `localStorage` key `` `xgold:drawings:${symbol}` ``,
    `JSON.parse` + `DrawingsStateSchema.safeParse`; hỏng/không tồn tại → trả `[]` (không throw).
  - `saveDrawings(symbol: string, drawings: Drawing[]): void` — `JSON.stringify` + ghi
    `localStorage` đúng key trên.
- File mới `lib/drawings/fibonacci.ts`:
  - `export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;`
  - `fibLevelPrice(p1Price: number, p2Price: number, level: number): number` —
    `p1Price + (p2Price - p1Price) * level` (retracement chuẩn: mức 0 tại p1, mức 1 tại p2).

**Tiêu chí nghiệm thu:**

- Unit test: round-trip `saveDrawings`→`loadDrawings` giữ nguyên dữ liệu; `loadDrawings` với
  localStorage chứa JSON hỏng/không khớp schema → trả `[]` không throw; `fibLevelPrice` tính tay
  cho `p1Price=100, p2Price=200` → mức `0.5` phải ra `150`, mức `0` ra `100`, mức `1` ra `200`.

**Phụ thuộc:** không.

---

### W-511 — route: `complex` (Opus · high — phần khó nhất kế hoạch)

**Mô tả:** Primitive renderer + hit-test cho 3 loại vẽ trên chart, chế độ vẽ/chọn/di
chuyển/xóa.

**Bối cảnh kỹ thuật:** dùng API chính thức `ISeriesPrimitive` + `series.attachPrimitive()` (xác
nhận tồn tại trong `lightweight-charts` 5.2.0, `typings.d.ts` dòng 2589–2598, 2693+). Đây là phần
**còn nhiều chỗ tự quyết kỹ thuật** (thuật toán hit-test, cách chuyển toạ độ time/price ↔ pixel
dùng API `timeScale().timeToCoordinate()`/`priceScale().priceToCoordinate()` của chart, cách vẽ
lên canvas trong `paneViews()`).

**Đặc tả (mục tiêu + ràng buộc, không khóa cách làm):**

- Đọc `lib/drawings/types.ts` (W-510) để biết model dữ liệu — build trên đó, không đổi schema.
- Cần 1 primitive class/factory nhận danh sách `Drawing[]` hiện tại (từ state React, ví dụ hook
  `use-drawings.ts` mới quản lý mảng `Drawing[]` + gọi `saveDrawings` mỗi khi đổi) và vẽ lên chart:
  - `horizontal-line`: 1 đường ngang tại `price` cố định, kéo dài hết chiều rộng pane.
  - `trendline`: 1 đoạn thẳng nối `p1`↔`p2` (toạ độ time/price → pixel bằng API chart).
  - `fib-retracement`: các đường ngang tại mức giá `fibLevelPrice(p1.price, p2.price, level)` cho
    mỗi `level` trong `FIB_LEVELS` (W-510), có nhãn % cạnh mỗi đường.
- 3 chế độ tương tác tối thiểu: **vẽ mới** (click 1 điểm cho horizontal-line; click 2 điểm liên
  tiếp cho trendline/fib), **chọn** (click vào drawing đã có để chọn — highlight), **xóa** (nút xóa
  khi đã chọn, hoặc phím Delete). Di chuyển (kéo-thả sửa vị trí) là **có thì tốt, không bắt buộc**
  cho v1 nếu hit-test kéo-thả tốn quá nhiều công sức so với deadline — nếu bỏ, ghi rõ trong PR đây
  là phạm vi thu hẹp có chủ đích, không phải thiếu sót.
- Toạ độ phải **sống sót đúng qua zoom/pan/đổi timeframe** (yêu cầu cứng — vì lưu theo
  `time`+`price`, chart tự vẽ lại đúng vị trí khi timeScale/priceScale đổi, đây là lý do model
  W-510 không dùng pixel).

**Tiêu chí nghiệm thu:**

- Vẽ được cả 3 loại bằng chuột thật; sau khi vẽ, zoom in/out + pan + đổi timeframe → vị trí vẽ vẫn
  đúng tương đối với dữ liệu giá (không trôi lệch).
- Chọn được 1 drawing đã vẽ (có phản hồi thị giác rõ, ví dụ đổi màu/độ dày khi chọn); xóa được.
- Reload trang → drawings của mã đang xem còn nguyên (đọc từ `localStorage` qua W-510).
- Unit test cho phần tính toán thuần (hit-test bằng khoảng cách điểm-tới-đoạn-thẳng cho trendline,
  ví dụ) — phần vẽ canvas không cần unit test (khó test, xác nhận bằng E2E + kiểm chứng thủ công).
- **E2E vẽ trendline bằng chuột thật** (Playwright `mouse.move`/`mouse.down`/`mouse.up`) — vẽ 1
  trendline, xác nhận primitive xuất hiện (kiểm tra qua canvas snapshot hoặc state nội bộ expose
  được cho test, tự quyết cách assert).
- Kiểm chứng thật bằng trình duyệt: vẽ cả 3 loại, chụp ảnh cả 2 theme, xác nhận màu sắc đủ tương
  phản AA trên cả Dark blue/Light.
- Lighthouse không tụt dưới ngưỡng sau khi thêm primitives (đo lại sau khi tích hợp).

**Phụ thuộc:** W-510.

---

### W-512 — route: `standard`

**Mô tả:** Thanh công cụ vẽ (UI chọn công cụ, kiểu TradingView).

**Đặc tả:**

- Component mới `components/chart/drawing-toolbar.tsx`: thanh dọc bên trái chart trên desktop
  (icon/nút cho từng loại: đường ngang, trendline, Fibonacci, + nút "chọn"/"xóa hết"), ẩn được
  (nút thu gọn) — trên mobile: thanh ngang phía trên hoặc dưới chart (không che nội dung), vùng
  chạm ≥44px mỗi nút.
- Kết nối với hook `use-drawings.ts` (từ W-511) qua props: chọn công cụ nào → set "chế độ vẽ hiện
  tại" (`activeTool: Drawing['type'] | 'select' | null`) — component `GoldChart` (hoặc primitive
  renderer W-511) đọc state này để biết đang ở chế độ nào.

**Tiêu chí nghiệm thu:**

- Chọn công cụ → chế độ vẽ đổi đúng (xác nhận qua hành vi: chọn "trendline" rồi click 2 điểm → vẽ
  ra trendline, không phải horizontal-line).
- Thu gọn/mở rộng thanh công cụ trên desktop; hiển thị hợp lý trên mobile (375px, kiểm chứng thật).
- E2E: chọn từng công cụ, xác nhận đúng loại được vẽ; axe 0 vi phạm cả 2 viewport.

**Phụ thuộc:** W-511.

---

## Đợt 17 — Cảnh báo giá (v1 client-side, xem quyết định đầu file)

### W-514 — route: `complex`

**Mô tả:** Cảnh báo giá v1 — kiểm tra khi tab đang mở, thông báo qua Notification API. KHÔNG cần
Supabase/backend (quyết định phạm vi đã nêu ở đầu file).

**Đặc tả (khung — còn chỗ tự quyết UX xin quyền thông báo):**

- Schema `lib/alerts/types.ts`: Zod object
  `{ id: string; symbol: string; direction: 'above' | 'below'; targetPrice: number; createdAt: string; triggeredAt: string | null }`.
  Lưu mảng `localStorage` key `xgold:alerts` (đọc/ghi qua hook `use-alerts.ts`, cùng pattern
  `use-indicator-config.ts`).
- Logic kiểm tra: mỗi khi `use-candles` cập nhật nến mới nhất cho 1 symbol đang có alert active
  (`triggeredAt === null`) khớp symbol đó — so sánh `latestClose` với `targetPrice` theo
  `direction` (`above`: đã vượt lên trên; `below`: đã xuống dưới). Khớp điều kiện →
  gọi Notification API (`new Notification(...)`, đã xin quyền trước đó qua
  `Notification.requestPermission()`) + đánh dấu `triggeredAt = now`.
- Xin quyền Notification: bạn tự quyết thời điểm hỏi (ví dụ: khi người dùng đặt alert đầu tiên) —
  nếu bị từ chối quyền, **không throw, không chặn UI** — alert vẫn lưu, chỉ không có thông báo hệ
  thống (ghi chú UI: "Bật thông báo trình duyệt để nhận cảnh báo").
- UI: nút "Đặt cảnh báo" trên `chart-page-client.tsx` (hoặc chuột phải trên chart tại mức giá —
  tự quyết, chuột phải phức tạp hơn nên có thể v1 chỉ làm nút + nhập tay mức giá), danh sách alert
  đang hoạt động (mã, hướng, mức giá, nút xóa).
- **Ranh giới quan trọng:** alert chỉ kiểm tra được **khi tab đang mở** (không phải nền, không
  phải khi đóng trình duyệt) — phải ghi rõ điều này ở UI (disclaimer ngắn cạnh danh sách alert),
  tránh người dùng hiểu nhầm là cảnh báo nền/qua email.

**Tiêu chí nghiệm thu:**

- Đặt alert `above` một mức giá thấp hơn giá hiện tại → khi nến mới nhất cập nhật (hoặc test giả
  lập dữ liệu), Notification được gọi đúng 1 lần (không lặp lại sau khi đã `triggeredAt`).
- Đặt alert `below` tương tự, hướng ngược lại.
- Xóa alert → biến mất khỏi danh sách + localStorage.
- Từ chối quyền Notification → không throw, UI vẫn hoạt động, có ghi chú rõ.
- Unit test: logic so khớp điều kiện `above`/`below` (pure function tách riêng khỏi hook, ví dụ
  `shouldTrigger(alert, latestClose): boolean`) — test tính tay đủ ca biên (đúng bằng mức giá,
  vượt qua, chưa tới).
- E2E: đặt alert, giả lập giá vượt ngưỡng (mock `Notification`), xác nhận gọi đúng; axe 0 vi phạm.
- Kiểm chứng thật bằng trình duyệt (xin quyền thông báo thật, xác nhận notification thật hiện ra).

**Phụ thuộc:** không (độc lập với Đợt 14–16, có thể làm song song nếu coordinator muốn, nhưng thứ
tự đề xuất vẫn xếp cuối theo đúng kế hoạch gốc).

---

## Tổng kết bảng việc

| ID    | Đợt | Route    | Phụ thuộc | Mô tả ngắn                    |
| ----- | --- | -------- | --------- | ----------------------------- |
| W-501 | 14  | standard | –         | Heikin Ashi (pure fn)         |
| W-502 | 14  | complex  | W-501     | Chọn kiểu chart (5 loại)      |
| W-503 | 14  | standard | –         | Log/Linear + auto-fit         |
| W-504 | 14  | standard | –         | Countdown nến                 |
| W-505 | 14  | standard | –         | Fullscreen + chụp ảnh         |
| W-506 | 15  | standard | –         | Chuẩn hóa % (pure fn)         |
| W-507 | 15  | complex  | W-506     | So sánh mã trên chart         |
| W-508 | 15  | standard | –         | Symbol search Ctrl+K          |
| W-509 | 15  | complex  | –         | Watchlist                     |
| W-510 | 16  | spec     | –         | Hạ tầng model vẽ (đặc tả kín) |
| W-511 | 16  | complex  | W-510     | Primitive renderer + hit-test |
| W-512 | 16  | standard | W-511     | Thanh công cụ vẽ              |
| W-514 | 17  | complex  | –         | Alerts v1 client-side         |

**Thứ tự dispatch đề xuất cho coordinator:** trong mỗi Đợt, việc không phụ thuộc chạy song song
được (ví dụ W-501/W-503/W-504/W-505 của Đợt 14 độc lập nhau); việc có phụ thuộc chờ đúng thứ tự.
Giữa các Đợt: hoàn tất Đợt 14 (đủ gate + Lighthouse) rồi mới sang Đợt 15, tương tự cho 15→16→17 —
đúng nguyên tắc "mỗi đợt hội tụ trước khi mở đợt sau" của khung hoàn thiện.

**Việc coordinator PHẢI dừng và báo lên phiên chính (không tự quyết):**

- Bất kỳ việc nào phát hiện đặc tả mâu thuẫn với code thật hiện tại (ví dụ API `lightweight-charts`
  khác với mô tả ở đây — dù đã xác nhận qua `typings.d.ts`, có thể lệch nếu `npm install` khác bản).
- W-511 nếu hit-test/di chuyển tốn công sức vượt quá ~2x ước lượng ban đầu — báo lên để quyết định
  có thu hẹp phạm vi thêm không (ví dụ bỏ hẳn "di chuyển", chỉ còn vẽ/xóa).
- W-514 nếu muốn đổi hướng sang (a) chờ Supabase — đây là thay đổi phạm vi lớn, không tự quyết.
