# Đợt 13 — Chart Ratio/Correlation + Panel chỉnh cấu hình quy tắc + Export CSV

> Đặc tả chi tiết (research-first, KHUNG-3) cho 3 hạng mục backlog **không bị chặn** bởi việc deploy
> Supabase thật (khác với "alert đẩy thông báo" — vẫn hoãn, xem mục 8). Nguồn backlog:
> `PROGRESS.md` mục "Tiếp theo" (sau Đợt 10) + ADR-0010 "Các phương án đã cân nhắc"/"Việc tiếp theo".
> Base: Đợt 10 (`xgold-analysis-surface-plan.md`, ADR-0010) + Đợt 11 (ADR-0011) + Đợt 12 (khung thời
> gian đầy đủ) đã xong — repo brownfield, stack không đổi (Next 16 App Router, TS strict, Zod 4,
> Vitest, Playwright+axe). Áp dụng nguyên tắc `existing-project-adoption.md`: chỉ thêm, không phá,
> tăng dần, mỗi thay đổi có test bảo vệ.

## 0. Phân loại & ràng buộc

- Hồ sơ dự án: C1 (web app, Next.js App Router) — không đổi. Cổng chất lượng: theme Dark
  blue+Light, WCAG AA, mobile-first, 5 cổng (`lint`/`type-check`/`format:check`/`test`/`build`),
  E2E+axe.
- **KHÔNG thêm dependency mới** trừ khi biện minh rõ (xem mục 3 cho CSV — dùng API trình duyệt
  thuần, không cần thư viện).
- **KHÔNG đổi schema/migration/ingestion.** Cả 3 hạng mục đều là client-side, dùng dữ liệu đã có qua
  `/api/candles`.
- **KHÔNG entry/SL/TP mới, KHÔNG ML** — ngoài phạm vi.

## 1. Hạng mục A — Chart cho Ratio/Correlation (nâng `market-context.tsx` từ thẻ số → có biểu đồ)

### 1.1 Vấn đề & phạm vi

Đợt 10 chốt v1 chỉ hiện **thẻ số** cho tỷ lệ Vàng/Bạc + tương quan XAU↔DXY (ADR-0010, lý do: tránh
phình phạm vi). Nay bổ sung **chart đường thời gian** cho tỷ lệ Vàng/Bạc — giá trị thực tế cao hơn vì
xu hướng tỷ lệ theo thời gian hữu ích hơn 1 con số tức thời. Tương quan XAU↔DXY (hệ số Pearson) **giữ
nguyên là thẻ số** — hệ số tương quan là 1 giá trị tổng hợp trên cửa sổ trượt, vẽ "chart hệ số theo
thời gian" (rolling correlation) là tính năng khác hẳn, phức tạp hơn nhiều (cần tính lại Pearson mỗi
điểm trên cửa sổ trượt) và **không có bằng chứng nhu cầu người dùng** — để ngoài phạm vi Đợt 13, ghi
vào backlog nếu người dùng cần sau.

### 1.2 Kỹ thuật — tái dùng `lightweight-charts` đã có (không thêm dependency)

- `lib/analysis/ratio.ts` đã có `ratioSeries(a, b)` trả `{ ts, ratio }[]` — **đủ dữ liệu, không cần
  hàm mới**.
- Component mới `components/screener/ratio-chart.tsx`: dùng `createChart` + `LineSeries` từ
  `lightweight-charts` (cùng thư viện `gold-chart.tsx` đã dùng — chỉ 1 line series, đơn giản hơn
  nhiều so với candlestick+markers). Theme màu lấy lại đúng cách `gold-chart.tsx` đọc CSS variable
  theo `data-theme` (không hard-code màu — CLAUDE.md §3.10).
- Input: `ratioSeries(xau1D, xag1D)` (đã có sẵn trong `use-screener` khi ở khung 1D, hoặc fetch
  riêng 1D như `market-context` đã làm cho thẻ tương quan — tái dùng logic fetch hiện có, không
  fetch trùng).
- Số điểm: dùng toàn bộ nến 1D đã fetch (giới hạn tự nhiên theo fixture/DB, không cần phân trang).
- Trạng thái rỗng: `<2` điểm → hiện "chưa đủ dữ liệu để vẽ biểu đồ" (chữ, không vẽ chart trống —
  nhất quán nguyên tắc "không đoán" đã áp toàn dự án).
- Đặt chart trong thẻ "Tỷ lệ Vàng/Bạc" hiện có ở `market-context.tsx` (dưới số + diễn giải), **không
  tạo trang mới**. Chiều cao cố định nhỏ (~120px) — không cạnh tranh không gian với bảng screener.

### 1.3 Kiểm thử

- Unit: không cần (component thuần trình bày, dữ liệu từ `ratioSeries` đã có unit test) — theo đúng
  quy ước loại trừ coverage cho component trình bày thuần đã áp cho `indicator-panel.tsx` v.v.
  (`vitest.config.ts`).
- E2E: mở rộng `e2e/screener.spec.ts` — assert chart ratio render (kiểm tra canvas/container có mặt,
  không assert pixel), axe vẫn 0 vi phạm sau khi thêm chart (lightweight-charts render qua canvas —
  đã biết an toàn a11y từ `gold-chart.tsx`, cần `aria-label` mô tả cho container).
- Kiểm chứng THẬT bằng trình duyệt: screenshot `/quet-tin-hieu` Dark blue + Light, xác nhận đường
  ratio hiển thị đúng xu hướng khớp dữ liệu fixture.

## 2. Hạng mục B — Panel chỉnh cấu hình quy tắc trên Screener

### 2.1 Vấn đề & phạm vi

Hiện `DEFAULT_ANALYSIS_CONFIG` (`lib/analysis/config.ts`) cố định cho mọi người dùng — không chỉnh
được bật/tắt quy tắc hay trọng số qua UI (Đợt 10 chốt v1 dùng mặc định). Trang `/chart/[symbol]` đã
có UI chỉnh `ChartConfig` (đường MA/RSI hiển thị) qua `lib/indicators/config.ts` — cần xác nhận cơ
chế lưu hiện có trước khi thiết kế panel mới (đọc code, không đoán).

### 2.2 Quyết định thiết kế cần chốt: nơi lưu cấu hình

| Phương án                                 | Ưu điểm                                                                                               | Nhược điểm                                                                                                    | Điểm                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **A. `localStorage` trình duyệt**         | Không đổi schema/API; đơn giản; đúng pattern "client-side, không dependency" đã dùng xuyên suốt dự án | Không đồng bộ giữa thiết bị/trình duyệt; mất khi xoá dữ liệu trình duyệt                                      | Cao                                               |
| B. Query string URL (`?rules=...`)        | Chia sẻ được qua link                                                                                 | Cấu hình phức tạp (7 quy tắc × enabled+weight) làm URL dài, khó đọc; công sức mã hoá/giải mã lớn hơn          | Trung bình                                        |
| C. Bảng CSDL mới (`user_analysis_config`) | Đồng bộ đa thiết bị                                                                                   | Cần bảng mới + có khái niệm "người dùng" (dự án hiện **không có auth** — ngoài phạm vi MVP theo `PROJECT.md`) | Thấp — vi phạm ranh giới "không đổi schema" mục 0 |

**Đề xuất: Phương án A (`localStorage`)** — nhất quán với việc dự án chưa có auth/tài khoản người
dùng, không cần bảng mới, không đổi API. Đây là đề xuất, **cần người dùng chốt** (mục 9).

### 2.3 Kỹ thuật

- `lib/analysis/config-storage.ts` (mới): `loadAnalysisConfig()` đọc `localStorage` key
  `xgold:analysis-config`, validate bằng `AnalysisConfigSchema.safeParse` (Zod đã có) — **parse lỗi
  hoặc thiếu → trả `DEFAULT_ANALYSIS_CONFIG`, KHÔNG throw** (localStorage có thể bị sửa tay/hỏng —
  không tin dữ liệu client, cùng nguyên tắc CLAUDE.md §3.2 áp cho input ngoài nói chung).
  `saveAnalysisConfig(config)` ghi sau khi validate qua schema. Bọc try/catch quanh
  `localStorage` (Safari private mode / quota có thể throw) — lỗi ghi thì bỏ qua, không crash UI.
- `components/screener/analysis-config-panel.tsx`: form 7 hàng (theo `RULE_IDS`) — checkbox bật/tắt
  - slider hoặc input số `weight` (0–1, step 0.05), 1 input `buyThreshold` (0–1), nút "Khôi phục mặc
    định". Validate tổng `weight` không bắt buộc = 1.0 (engine đã tự chuẩn hoá theo `maxScore`, xem
    `lib/analysis/engine.ts`) — **xác nhận lại cách engine dùng weight trước khi viết panel** (đọc
    code, không giả định).
- Áp dụng: `use-screener.ts` đọc config từ `loadAnalysisConfig()` thay vì hard-code
  `DEFAULT_ANALYSIS_CONFIG`; **áp dụng luôn cho `/chart/[symbol]` và `use-confluence.ts`** để nhất
  quán (một nơi chỉnh → toàn app dùng chung, tránh 2 nguồn sự thật khác nhau về "quy tắc nào đang
  bật") — panel đặt trên trang screener nhưng cấu hình có hiệu lực toàn cục qua `localStorage`.
- Vị trí UI: panel gấp lại được (`<details>`/disclosure) trên `/quet-tin-hieu`, mặc định đóng để
  không chiếm không gian — nhất quán mật độ thông tin hiện có của trang.

### 2.4 Kiểm thử

- Unit: `lib/analysis/config-storage.test.ts` — đọc khi trống → mặc định; ghi rồi đọc lại → đúng
  giá trị; JSON hỏng trong `localStorage` → mặc định (không throw); `localStorage.setItem` ném lỗi
  (mock) → không crash.
- E2E: `e2e/analysis-config.spec.ts` — mở panel, đổi 1 trọng số + lưu, tải lại trang → giữ nguyên
  (localStorage bền qua reload), bảng screener/panel MTF phản ánh đúng thay đổi (vd tắt hẳn 1 quy
  tắc → tổng điểm đổi), nút khôi phục mặc định hoạt động, axe 0 vi phạm.
- Kiểm chứng THẬT: đổi cấu hình trên trình duyệt thật, xác nhận số tín hiệu ở cả `/quet-tin-hieu` và
  `/chart/xauusd` cùng đổi theo (nhất quán toàn cục như thiết kế mục 2.3).

## 3. Hạng mục C — Export CSV

### 3.1 Phạm vi

Hai điểm export: (a) **nến của 1 mã/khung** từ trang chart (dữ liệu `/api/candles` đang hiển thị);
(b) **kết quả screener** (bảng tín hiệu mọi mã tại thời điểm xem). Không export dữ liệu server-side
mới — chỉ xuất dữ liệu client **đã có sẵn trong bộ nhớ trình duyệt** (đã fetch để vẽ chart/bảng).

### 3.2 Kỹ thuật — API trình duyệt thuần (không thêm dependency)

- `lib/csv/to-csv.ts` (mới, pure function, dễ unit test tính tay): `toCsv(rows, columns)` nhận mảng
  object + danh sách cột (`{key, header}`), trả chuỗi CSV (dấu phẩy, escape dấu phẩy/nháy kép/xuống
  dòng theo RFC 4180 tối thiểu — chuỗi chứa `,`/`"`/`\n` thì bọc `"..."` và nhân đôi `"` bên trong).
- `lib/csv/download.ts` (mới, chỉ chạy client — `'use client'` boundary tại nơi gọi): tạo `Blob`
  loại `text/csv;charset=utf-8;`, `URL.createObjectURL`, thẻ `<a download>` ẩn rồi `.click()`, sau đó
  `URL.revokeObjectURL` — API DOM chuẩn, **không cần thư viện** (đã xác minh: không có nhu cầu Excel
  đặc thù như multi-sheet, CSV thuần đủ dùng cho nhu cầu "tải về xem/đối chiếu").
  - **BOM UTF-8** (`﻿` ở đầu chuỗi) — bắt buộc để Excel (phổ biến với người dùng Việt Nam) hiển
    thị đúng tiếng Việt có dấu thay vì ký tự lỗi; xác nhận đây là vấn đề đã biết rộng rãi của Excel
    với CSV UTF-8 không BOM.
- Nút "Tải CSV" trên `/chart/[symbol]` (cạnh vùng chọn khung thời gian) — cột: `ts, open, high, low,
close, volume`. Tên file: `{symbol}-{timeframe}-{ngày xuất}.csv` (vd `xauusd-1D-2026-07-16.csv`).
- Nút "Tải CSV" trên `/quet-tin-hieu` — cột: `symbol, price, signal, strength, rsi14, trend, source`
  (khớp cột bảng `screener-table.tsx` đang hiện). Tên file: `screener-{khung}-{ngày xuất}.csv`.
- **Không** export dữ liệu Confluence/MarketContext ở đợt này (nhu cầu chưa rõ, có thể thêm sau nếu
  người dùng cần — tránh phình phạm vi).

### 3.3 Kiểm thử

- Unit (tính tay, không mock DOM): `lib/csv/to-csv.test.ts` — hàng cơ bản, escape dấu phẩy, escape
  nháy kép, escape xuống dòng, mảng rỗng → chỉ header.
- E2E: `e2e/csv-export.spec.ts` — click nút Tải CSV trên trang chart, xác nhận trình duyệt kích hoạt
  tải (Playwright `page.waitForEvent('download')`), đọc nội dung file tải về đối chiếu đúng dữ liệu
  đang hiển thị; tương tự cho screener. Axe: nút có `aria-label` rõ ràng ("Tải dữ liệu về máy dạng
  CSV"), không cần thêm assertion axe riêng (nút chuẩn, không có vùng cuộn mới).

## 4. Ranh giới phạm vi (KHÔNG làm ở đợt này)

- KHÔNG alert đẩy thông báo (cần Supabase thật chạy nền — vẫn hoãn, xem mục 8).
- KHÔNG rolling-correlation chart (mục 1.1).
- KHÔNG export CSV cho Confluence/MarketContext (mục 3.2).
- KHÔNG thêm auth/tài khoản người dùng để đồng bộ cấu hình đa thiết bị (mục 2.2 phương án C bị loại).
- KHÔNG đổi tham số chu kỳ từng quy tắc (SMA 50/200, RSI 14…) — panel chỉ chỉnh bật/tắt + trọng số +
  ngưỡng phân loại, đúng ranh giới đã ghi ở `config.ts` dòng 13-14 (giữ nguyên quyết định Đợt 6-8).

## 5. Trình tự đề xuất cho coder (giữ FIFO, có thể tách 3 PR độc lập theo hạng mục A/B/C)

1. Hạng mục C trước (độc lập nhất, rủi ro thấp nhất — pure function `to-csv.ts` dễ test, không đụng
   engine phân tích).
2. Hạng mục A (chart ratio — tái dùng `lightweight-charts` + `ratio.ts` đã có, không đụng cấu hình).
3. Hạng mục B sau cùng (rủi ro cao nhất — đổi luồng đọc cấu hình ở cả 3 nơi dùng
   `DEFAULT_ANALYSIS_CONFIG`: chart, confluence, screener; cần chạy lại toàn bộ E2E liên quan để xác
   nhận không phá hành vi mặc định khi chưa ai chỉnh gì trong `localStorage`).
4. Mỗi hạng mục: code → unit test → E2E → kiểm chứng trình duyệt thật (Dark blue + Light) → cập nhật
   `docs/FEATURE-MAP.md` (FT-21/22/23) + `PROJECT.md` + `PROGRESS.md` → chạy đủ 5 cổng → PR riêng.

## 6. Tài liệu phải cập nhật (trong từng PR tương ứng)

- `docs/FEATURE-MAP.md`: FT-21 (Export CSV), FT-22 (Chart ratio), FT-23 (Panel cấu hình quy tắc).
- `PROJECT.md` mục 2 (Could-have → đã làm) + mục 7 (luồng mới) + mục 9 (Đợt 13).
- `PROGRESS.md`: "Đã xong" + cập nhật "Tiếp theo" (rút gọn backlog còn lại xuống chỉ còn alert đẩy).
- ADR mới nếu người dùng chốt mục 2.2: `docs/adr/0012-analysis-config-client-storage.md` (quyết
  định `localStorage`, không phải trang trí — có đánh đổi thật về đồng bộ đa thiết bị nên đáng ghi).

## 7. Kiểm thử tổng — điều kiện ra của đợt

- 5 cổng (`lint`/`type-check`/`format:check`/`test`/`build`) xanh, coverage giữ ≥ 70% (không tụt so
  với mức hiện tại ~89%/75%/82%/91%).
- Toàn bộ E2E cũ + mới xanh (desktop + mobile), axe 0 vi phạm trên mọi trang chạm tới.
- Kiểm chứng THẬT bằng trình duyệt cho cả 3 hạng mục, cả Dark blue + Light.

## 8. Ghi chú — hạng mục backlog CÒN LẠI ngoài phạm vi Đợt 13

**Alert đẩy thông báo** (dựa trên `computeConfluence`/screener vượt ngưỡng): cần tác vụ chạy nền định
kỳ (pg_cron hoặc cron ngoài) kiểm tra điều kiện rồi gửi (web push/email) — phụ thuộc trực tiếp vào
việc **có Supabase project thật đã deploy** (nợ kỹ thuật hiện tại, xem `PROGRESS.md` mục "Nợ kỹ
thuật"). Không thể làm trong sandbox này. Giữ nguyên trong backlog, ưu tiên lại sau khi hạ tầng thật
sẵn sàng.

## 9. Cần người dùng chốt gì

1. **Phạm vi Đợt 13:** làm cả A+B+C, hay chỉ một phần? (đề xuất: cả 3, độ rủi ro thấp–trung bình,
   không đổi schema, có thể tách PR độc lập theo mục 5).
2. **Hạng mục B — nơi lưu cấu hình:** xác nhận **Phương án A (`localStorage`)** (mục 2.2), hay muốn
   trì hoãn tới khi có auth để làm Phương án C (đồng bộ đa thiết bị)?
3. **Hạng mục B — phạm vi áp dụng:** cấu hình chỉnh trên `/quet-tin-hieu` có nên áp dụng **toàn cục**
   (ảnh hưởng cả `/chart/[symbol]` + panel MTF, như đề xuất mục 2.3), hay chỉ ảnh hưởng riêng trang
   screener (2 nguồn cấu hình độc lập)? Đề xuất: toàn cục, tránh nhầm lẫn "vì sao 2 trang cho số khác
   nhau".
