# Đợt 10 — Bề mặt phân tích (MTF confluence + Screener + Ratio/Correlation)

> **Trạng thái: ĐÃ CHỐT HƯỚNG — người dùng duyệt "Đợt 10: A+B(+C)" (2026-07-13), giữ ranh giới
> pháp lý như Đợt 7.** Đây là **đặc tả để giao coder** (`executor`) thực thi. Lập theo `/consult`
> (brownfield): rà tài sản sẵn có (engine phân tích pure-TS symbol-agnostic + registry đa mã +
> render client-side) rồi thiết kế tính năng **nhân bội** tài sản đó mà không thêm dependency,
> không đụng schema, không cần deploy thật.

## 0. Nguyên tắc bất biến của đợt (coder phải tuân)

1. **Không thêm dependency runtime mới, không đụng schema CSDL** (nhất quán ADR-0007/0010). Mọi logic
   là pure TS tái dùng `lib/analysis/` + `lib/indicators/` + `lib/candles/resample.ts` sẵn có.
2. **Ranh giới pháp lý như Đợt 7 (bắt buộc):** đầu ra là **"tín hiệu kỹ thuật tham khảo"**, không
   phải khuyến nghị đầu tư. Mọi bề mặt hiển thị tín hiệu (screener, MTF) PHẢI mang **disclaimer cố
   định** giống `analysis-panel.tsx`; wording "tín hiệu kỹ thuật"; **KHÔNG** entry/SL/TP.
3. **Chỉ dùng nến đã đóng** — tái dùng `suggestLatest`/`evaluateAt` (đã đảm bảo không nhìn tương lai).
4. **Chống lỗi logic (CLAUDE.md §3.6):** chia cho 0 (ratio khi giá bạc = 0, tương quan khi phương sai
   = 0), mảng rỗng/ngắn hơn chu kỳ, lệch trục thời gian giữa 2 mã (align theo `ts`, không giả định
   cùng độ dài), tiền không dùng so sánh float ngây thơ.
5. **Test giá trị tính TAY** cho mọi lib mới (chuẩn Đợt 3) — không copy output của chính hàm đang test.
6. **Đủ 4 trạng thái UI** (tải/rỗng/lỗi/thành công), **axe 0 vi phạm**, **WCAG AA cả Dark blue +
   Light**, **mobile-first** (vùng cuộn ngang bảng phải `role="region"` + `aria-label` + `tabIndex={0}`
   như đã vá ở `so-sanh-gia-vang`). 5 cổng xanh, coverage ≥ 70%.

## 1. Tài sản tái dùng (đọc trước khi code — KHÔNG viết lại)

| Cần gì                         | Dùng API sẵn có                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Gợi ý Mua/Bán tại nến mới nhất | `suggestLatest(candles, config, params): Suggestion \| null` — `lib/analysis`                 |
| Cấu hình + tham số mặc định    | `DEFAULT_ANALYSIS_CONFIG`, `DEFAULT_ANALYSIS_PARAMS` — `lib/analysis`                         |
| Kiểu kết quả                   | `Suggestion { ts, direction, score, maxScore, signals }` — `score/maxScore` là biên chuẩn hoá |
| Resample khung 4h/1W           | `resample(candles, to): Candle[]` — `lib/candles/resample.ts` (4h từ 1h, 1W từ 1D)            |
| RSI/SMA cho cột hiển thị nhanh | `rsi(candles, period)`, `sma(candles, period)` — `lib/indicators`                             |
| Danh sách mã                   | `INSTRUMENTS` — `lib/instruments.ts` (đọc `symbol`, `slug`, `label`, `sample`)                |
| Lấy nến (client)               | `GET /api/candles?symbol=<SYM>&timeframe=<1h\|4h\|1D\|1W>` (trả `{candles, source}`)          |
| Nhãn nguồn dữ liệu             | field `source: 'supabase' \| 'sample'` của response `/api/candles`                            |
| Chuẩn hoá điểm tín hiệu        | `norm = maxScore > 0 ? score / maxScore : 0` (dải −1..+1) — DÙNG CHUNG cho MTF + screener     |

## 2. Tính năng A — Bảng hợp lưu đa khung (MTF confluence)

**Ý:** trên trang chart của MỘT mã, chạy engine đồng thời trên **1h / 4h / 1D / 1W** và hiển thị
bảng hợp lưu (mỗi khung một tín hiệu + một dòng tổng hợp). Trader thật ra quyết định theo confluence.

### 2.1 Lib mới: `lib/analysis/multi-timeframe.ts` (pure, unit test)

```ts
import type { Candle, Timeframe } from '@/lib/candles/types';
import type { AnalysisConfig, AnalysisParams, Suggestion, SignalDirection } from '@/lib/analysis';

export const CONFLUENCE_TIMEFRAMES: readonly Timeframe[] = ['1h', '4h', '1D', '1W'];
/** Ngưỡng phân loại tổng hợp trên điểm chuẩn hoá trung bình (dải −1..+1). */
export const CONFLUENCE_THRESHOLD = 0.25;

export interface TimeframeVerdict {
  timeframe: Timeframe;
  suggestion: Suggestion | null; // null nếu khung đó không đủ nến
  norm: number; // maxScore>0 ? score/maxScore : 0 ; 0 nếu suggestion null
}

export interface Confluence {
  perTimeframe: TimeframeVerdict[];
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  /** Trung bình `norm` trên các khung CÓ suggestion (bỏ qua khung null). 0 nếu không khung nào có. */
  meanNorm: number;
  overall: SignalDirection; // buy nếu meanNorm≥+TH, sell nếu ≤−TH, else neutral
}

/**
 * @param candlesByTimeframe nến đã chuẩn bị cho từng khung (1h/4h/1D/1W). Khung thiếu → mảng rỗng.
 */
export function computeConfluence(
  candlesByTimeframe: Partial<Record<Timeframe, readonly Candle[]>>,
  config: AnalysisConfig,
  params?: AnalysisParams,
): Confluence;
```

- `meanNorm` = trung bình các `norm` của khung có `suggestion !== null`; nếu 0 khung → `meanNorm = 0`,
  `overall = 'neutral'`.
- Đếm buy/sell/neutral theo `suggestion.direction` (khung null tính vào `neutralCount`).
- Tất định, không nhìn tương lai (đã đảm bảo bởi `suggestLatest`).

### 2.2 Hook: `components/chart/use-confluence.ts` (client)

- Đầu vào: `symbol` (mã đang xem), `config: AnalysisConfig` (LẤY TỪ cấu hình hiện tại của người dùng
  trên trang chart — `use-indicator-config`, để MTF khớp đúng bộ quy tắc họ đang bật).
- Chỉ **fetch 2 lần**: `/api/candles?symbol=&timeframe=1h` và `...=1D`. Suy ra **4h = `resample(1h,'4h')`**,
  **1W = `resample(1D,'1W')`** (tái dùng `resample`, không gọi thêm API). Truyền vào `computeConfluence`.
- Hủy kết quả cũ khi đổi symbol/config (cùng pattern `use-candles`). Trạng thái: loading/error/data.

### 2.3 UI: `components/chart/confluence-panel.tsx` (thêm vào trang `/chart/[symbol]`)

- Bảng: mỗi khung 1 dòng (khung · badge Mua/Bán/Trung lập · thanh/độ mạnh từ `norm`) + dòng **Tổng
  hợp** (overall + "x/4 khung thiên Mua"). Badge màu theo direction dùng **design token** (không
  hard-code màu; buy/sell/neutral khớp bảng màu `analysis-panel`).
- Mang **disclaimer dùng chung** (mục 5). Đủ 4 trạng thái UI. Vùng chạm ≥44px. Đặt **dưới**
  `analysis-panel` trên trang chart (không phá layout hiện có).
- aria: bảng có `<caption>`/`aria-label` rõ "Hợp lưu tín hiệu đa khung theo mã {label}".

## 3. Tính năng B — Màn hình quét tín hiệu (Screener)

**Ý:** một trang liệt kê **tất cả mã** trong registry với tín hiệu hiện tại + chỉ số then chốt, sắp
xếp theo độ mạnh → biến app từ "xem từng chart" thành "quét cả bảng".

### 3.1 Trang: `app/quet-tin-hieu/` (slug tiếng Việt, khớp `gia-vang-trong-nuoc`/`so-sanh-gia-vang`)

- `page.tsx` (server, metadata SEO) + `page-client.tsx` (client, dùng hook).
- **Bộ chọn khung** (1h/4h/1D/1W), **mặc định `1D`**. Screener chạy trên khung đang chọn cho MỌI mã.
- Bảng, mỗi mã 1 dòng — cột:
  | Cột          | Nguồn                                                                                |
  | ------------ | ------------------------------------------------------------------------------------ |
  | Mã           | `INSTRUMENTS[].label` (link `/chart/{slug}`)                                         |
  | Giá mới nhất | `candles.at(-1).close` (định dạng theo `currency`)                                   |
  | Tín hiệu     | badge từ `suggestLatest().direction`                                                 |
  | Độ mạnh      | `norm` (thanh + số, dải −1..+1)                                                      |
  | RSI(14)      | `rsi(candles,14).at(-1).value` (null → "—")                                          |
  | Xu hướng     | giá đóng cửa so `sma(candles,200).at(-1)`: trên → "Tăng", dưới → "Giảm", thiếu → "—" |
  | Nguồn        | `source` ('Thực'/'Mẫu')                                                              |
- **Sắp xếp mặc định:** `norm` giảm dần (Mua mạnh → Bán mạnh). Cho phép bấm tiêu đề cột để đảo chiều
  sort theo `norm` (v1 chỉ cần sort theo độ mạnh; các cột khác tùy chọn — KHÔNG bắt buộc).
- Dùng `DEFAULT_ANALYSIS_CONFIG` (screener không có panel chỉnh cấu hình ở v1 — ghi rõ trên UI
  "theo bộ quy tắc mặc định").

### 3.2 Hook: `components/screener/use-screener.ts` (client)

- Fetch song song `/api/candles?symbol=&timeframe=<tf>` cho MỌI mã trong `INSTRUMENTS`
  (`Promise.all`). Mỗi mã: `suggestLatest(candles, DEFAULT_ANALYSIS_CONFIG)` + rsi/sma cho cột.
- Một mã lỗi/rỗng → dòng đó ở trạng thái "—" (KHÔNG làm hỏng cả bảng). Trạng thái tổng: loading tới
  khi mọi fetch xong; error chỉ khi TẤT CẢ lỗi.
- Đổi khung → refetch, hủy kết quả cũ.

### 3.3 UI: `components/screener/screener-table.tsx`

- Bảng tabular-nums; vùng cuộn ngang mobile `role="region"` + `aria-label` + `tabIndex={0}` (như
  `compare-table`). Disclaimer dùng chung (mục 5). 4 trạng thái UI. AA cả 2 theme.
- **Link từ trang chủ** (`app/page.tsx`) + thêm vào `app/sitemap.ts`.

## 4. Tính năng C — Tỷ lệ Vàng/Bạc + Tương quan DXY (thẻ liên thị trường)

**Ý:** hai chỉ số liên thị trường tính từ dữ liệu ĐÃ CÓ, đặt thành **thẻ số** trên trang screener
(mục "Bối cảnh thị trường") — v1 **chỉ số + diễn giải ngắn**, KHÔNG thêm chart mới (tránh phình).

### 4.1 Lib mới: `lib/analysis/ratio.ts` (pure, unit test giá trị tính tay)

```ts
import type { Candle } from '@/lib/candles/types';

/** Ghép 2 chuỗi nến theo `ts` chung (inner join), tỷ lệ = a.close / b.close. Bỏ điểm b.close ≤ 0. */
export function ratioSeries(
  a: readonly Candle[],
  b: readonly Candle[],
): { ts: string; ratio: number }[];

/** Lợi suất đơn giản close[i]/close[i-1]-1. Trả mảng dài n-1 (n<2 → []). */
export function simpleReturns(candles: readonly Candle[]): number[];

/**
 * Hệ số tương quan Pearson trên 2 mảng ĐÃ align cùng độ dài. `null` nếu <2 điểm hoặc phương sai một
 * bên = 0 (chia 0). Kết quả kẹp [−1, +1].
 */
export function pearson(a: readonly number[], b: readonly number[]): number | null;

/** Align XAU & DXY theo `ts` chung → lợi suất → pearson trên `window` điểm gần nhất (mặc định 30). */
export function correlationXauDxy(
  xau: readonly Candle[],
  dxy: readonly Candle[],
  window?: number,
): number | null;
```

- **Test tính tay bắt buộc:** pearson của 2 chuỗi nghịch biến hoàn hảo → −1; đồng biến hoàn hảo → +1;
  phương sai 0 → null; ratio cơ bản (vd XAU 3200 / XAG 40 = 80); align bỏ đúng `ts` lệch.

### 4.2 UI: `components/screener/market-context.tsx` (thẻ trên trang screener)

- Thẻ 1 — **Tỷ lệ Vàng/Bạc (XAU/XAG)**: `ratioSeries(xau1D, xag1D).at(-1).ratio` (làm tròn 2 số);
  diễn giải trung tính: "tỷ lệ cao → bạc rẻ tương đối so với vàng" (không phải khuyến nghị).
- Thẻ 2 — **Tương quan XAU ↔ DXY (30 phiên ngày)**: `correlationXauDxy(xau1D, dxy1D)`; nhãn dải:
  `≤ −0.5` "nghịch biến mạnh", `−0.5..−0.2` "nghịch biến", `−0.2..0.2` "ít tương quan", `> 0.2`
  "đồng biến"; null → "chưa đủ dữ liệu".
- Lấy nến 1D của XAU/XAG/DXY qua `/api/candles` (gộp vào `use-screener` để không fetch trùng nếu
  screener đang ở khung 1D; nếu khác khung, fetch riêng 1D cho 3 mã này). Thiếu bất kỳ mã → thẻ hiện
  "chưa đủ dữ liệu", KHÔNG đoán.

## 5. Dùng chung disclaimer (DRY — CLAUDE.md §3.4)

- Nếu disclaimer đang **inline** trong `analysis-panel.tsx` → **tách** thành
  `components/chart/analysis-disclaimer.tsx` (giữ nguyên chữ + style), rồi `analysis-panel`,
  `confluence-panel`, `screener-table` cùng import. Nếu đã là component/hằng dùng chung → tái dùng
  thẳng. **Không chép chuỗi disclaimer ở nhiều nơi.**

## 6. Kiểm thử (điều kiện ra của đợt)

- **Unit (Vitest, giá trị tính tay):** `lib/analysis/multi-timeframe.test.ts` (confluence: mọi khung
  buy → overall buy & meanNorm=+1; khung null bị loại khỏi meanNorm; ngưỡng biên ±0.25),
  `lib/analysis/ratio.test.ts` (mục 4.1). Không mock (pure).
- **E2E (Playwright + axe, desktop + mobile):**
  - `e2e/screener.spec.ts`: render bảng đủ mã, đổi khung cập nhật, sort theo độ mạnh, thẻ bối cảnh
    thị trường hiện số, axe 0 vi phạm, điều hướng từ trang chủ.
  - `e2e/confluence.spec.ts` (hoặc mở rộng `chart.spec.ts`): panel MTF hiện đủ 4 khung + dòng tổng
    hợp trên `/chart/xauusd`, axe 0 vi phạm.
- **Kiểm chứng THẬT bằng trình duyệt** (chuẩn Đợt 2/3): screenshot screener + panel MTF ở cả Dark
  blue và Light; đối chiếu số tín hiệu khớp giá trị chart của mã đó.
- **5 cổng:** `lint` · `type-check` · `format:check` · `test` · `build` đều xanh; coverage ≥ 70%;
  Lighthouse trang mới không tụt ngân sách (thêm `quet-tin-hieu` vào `lighthouserc.json` nếu phù hợp).

## 7. Tài liệu phải cập nhật (trong cùng PR)

- `docs/FEATURE-MAP.md`: thêm FT-18 (Screener), FT-19 (MTF confluence), FT-20 (Ratio/Correlation)
  với điểm vào + test.
- `PROJECT.md` mục 2 (chuyển các mục Could-have tương ứng sang đã làm) + mục 7 (luồng mới) + mục 9
  (Đợt 10).
- `PROGRESS.md`: mục "Đã xong" thêm Đợt 10; cập nhật "Tiếp theo".
- `docs/adr/0010-analysis-surface.md` (đã kèm trong đặc tả này) — không sửa, chỉ tham chiếu.

## 8. Ranh giới phạm vi (KHÔNG làm ở đợt này — chống phình)

- KHÔNG thêm chart mới cho ratio (chỉ thẻ số ở v1). KHÔNG panel chỉnh cấu hình trên screener.
- KHÔNG entry/SL/TP, KHÔNG ML, KHÔNG alert đẩy (cần deploy thật — backlog sau).
- KHÔNG thêm dependency, KHÔNG migration/đổi schema, KHÔNG đụng ingestion.

## 9. Trình tự đề xuất cho coder (một PR, giữ FIFO)

1. `lib/analysis/multi-timeframe.ts` + `ratio.ts` + unit test tính tay (chạy `npm test` xanh trước khi lên UI).
2. Tách/thống nhất disclaimer dùng chung (mục 5).
3. UI A: `use-confluence.ts` + `confluence-panel.tsx`, cắm vào trang chart.
4. UI B: trang `quet-tin-hieu` + `use-screener.ts` + `screener-table.tsx` + link trang chủ + sitemap.
5. UI C: `market-context.tsx` trên trang screener.
6. E2E screener + confluence; kiểm chứng trình duyệt thật; cập nhật docs (mục 7); chạy đủ 5 cổng.
</content>

</invoke>
