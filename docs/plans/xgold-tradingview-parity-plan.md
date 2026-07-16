# Kế hoạch phát triển Xgold "giống TradingView" (TradingView parity)

> Trạng thái: **ĐỀ XUẤT — chờ người dùng duyệt** trước khi thực thi (theo CLAUDE.md mục 2).
> Ngày lập: 2026-07-16. Nối tiếp Đợt 13 (`PROGRESS.md`). Tác giả: AI (phiên planning).
> Tài liệu liên quan: `docs/plans/xgold-mvp-plan.md`, `xgold-development-plan.md`,
> `xgold-analysis-surface-plan.md`, ADR-0002 (lightweight-charts), ADR-0010/0011.

## 1. Mục tiêu & phạm vi

Đưa trải nghiệm chart của Xgold tiến gần TradingView ở các mặt người dùng cảm nhận rõ nhất:
**tương tác trên chart** (vẽ, so sánh, đổi kiểu nến), **điều hướng** (tìm mã, watchlist),
**tiện ích** (chụp/xuất, fullscreen, thang log) và **cảnh báo giá**. KHÔNG nhắm sao chép
toàn bộ TradingView (social, Pine Script editor, broker integration — ngoài phạm vi vĩnh viễn).

Ràng buộc kiến trúc giữ nguyên (ADR-0002, ADR-0007): lightweight-charts 5 (không đổi thư viện
chart), engine phân tích pure TS, không thêm dependency nặng khi chưa có lý do, mọi tính năng
đủ 4 trạng thái UI + WCAG AA cả Dark blue/Light + E2E.

## 2. Hiện trạng — đã có gì so với TradingView

| Nhóm TradingView                                                     | Xgold hiện tại                      |
| -------------------------------------------------------------------- | ----------------------------------- |
| Nến Nhật + 8 khung 5m→1M                                             | ✅ Đợt 12                           |
| Volume overlay + legend OHLC ±%                                      | ✅ Đợt 13                           |
| Indicators: SMA/EMA/RSI/MACD/BB/Ichimoku/ATR (multi-instance MA/RSI) | ✅ Đợt 3–11                         |
| Tín hiệu + markers + Entry/SL/TP                                     | ✅ Đợt 7–11 (vượt TradingView free) |
| Đa symbol + screener + MTF confluence                                | ✅ Đợt 9–10                         |
| Chia sẻ cấu hình qua URL                                             | ✅ Đợt 3 (`?cfg=`)                  |
| Kiểu chart khác (line/area/bar/Heikin Ashi)                          | ❌                                  |
| Công cụ vẽ (trendline, ngang, Fibonacci)                             | ❌                                  |
| So sánh mã trên cùng chart (thang %)                                 | ❌                                  |
| Thang log / auto, fullscreen, chụp ảnh, xuất CSV                     | ❌                                  |
| Tìm mã nhanh (symbol search) + watchlist                             | ❌ (mới có SymbolSwitcher 4 nút)    |
| Cảnh báo giá (alerts)                                                | ❌ (cần Supabase thật)              |
| Bar replay, multi-chart layout                                       | ❌ (xem mục 6 — hoãn)               |

## 3. Lộ trình đề xuất — 4 đợt (14 → 17)

Nguyên tắc xếp: giá trị/công sức giảm dần; việc phụ thuộc hạ tầng ngoài sandbox (alerts) xếp
cuối; mỗi đợt một PR (hoặc tách nhỏ hơn), qua `/gate`, kiểm chứng thật bằng trình duyệt.

### Đợt 14 — Kiểu chart + tiện ích thang giá (nhỏ, thuần client)

1. **Kiểu chart**: Nến / Bar / Line / Area / **Heikin Ashi** (tính pure TS trong
   `lib/candles/heikin-ashi.ts`, unit test giá trị tính tay; các kiểu còn lại là series có sẵn
   của lightweight-charts). Nút chọn kiểu cạnh `timeframe-switcher`, lưu vào `ChartConfig`
   (`.default('candles')` — tương thích ngược URL/localStorage).
2. **Thang giá**: toggle **Log/Linear** + nút **auto-fit** (`priceScale.applyOptions({ mode })`,
   `timeScale.fitContent()`); đường giá cuối + countdown nến hiện tại (lightweight-charts có
   `lastValueVisible`; countdown tự tính từ timeframe — hiển thị ở legend).
3. **Fullscreen** (Fullscreen API, có fallback ẩn header) + **chụp ảnh chart**
   (`chart.takeScreenshot()` → PNG download) + **xuất CSV** nến đang xem (backlog cũ, gỡ nợ).

- Tiêu chí: đổi kiểu chart giữ nguyên indicators/markers; Heikin Ashi có ≥4 unit test tính tay;
  E2E: đổi kiểu + log scale + screenshot tải được file; axe 0 vi phạm.
- Ước lượng: ~2–3 phiên làm việc. Rủi ro thấp.

### Đợt 15 — Symbol search + watchlist + so sánh mã

1. **Symbol search**: hộp tìm nhanh (Ctrl+K / nút 🔍) lọc trên `lib/instruments.ts` theo
   symbol/tên; thay dần `SymbolSwitcher` khi registry lớn lên (giữ switcher cho ≤6 mã).
2. **Watchlist**: cột phải (mobile: sheet dưới) liệt kê mã đã ghim — giá cuối, ±% ngày, tín hiệu
   từ engine (tái dùng `use-screener`); lưu localStorage; click → chuyển chart.
3. **So sánh mã (Compare)**: overlay mã thứ 2 lên pane giá bằng **thang %** (chuẩn hóa về nến
   đầu khung nhìn — line series, thang giá riêng), tối đa 2 mã so sánh; chọn từ registry.

- Tiêu chí: hàm chuẩn hóa % có unit test tính tay; watchlist sống sót reload; E2E cả 3 tính năng
  - axe. Ước lượng: ~2–3 phiên. Rủi ro thấp–vừa (bố cục mobile).

### Đợt 16 — Công cụ vẽ (lớn nhất, quyết định kiến trúc → ADR mới)

lightweight-charts **không có** drawing tools sẵn — phải tự làm bằng **Series Primitives /
Pane Primitives** (plugin API chính thức của v5). Đề xuất phạm vi v1, làm tăng dần:

1. Hạ tầng: lớp `lib/drawings/` (model + Zod schema, toạ độ theo `time`+`price` — không theo
   pixel, sống sót khi zoom/pan/đổi khung), lưu localStorage theo symbol, primitive renderer +
   hit-test, chế độ chọn/di chuyển/xóa.
2. Công cụ v1: **đường ngang** (giá) → **trendline** (2 điểm) → **Fibonacci retracement**
   (2 điểm, các mức 0/0.236/0.382/0.5/0.618/0.786/1).
3. Thanh công cụ dọc trái kiểu TradingView (ẩn được trên mobile, thao tác chạm có vùng ≥44px).

- **ADR bắt buộc** trước khi code: tự viết primitives vs dùng gói cộng đồng (hệ sinh thái plugin
  lightweight-charts) — research-first xác minh gói/phiên bản bằng nguồn sống rồi mới chốt.
- Tiêu chí: vẽ/sửa/xóa 3 loại; toạ độ đúng sau zoom + đổi timeframe; reload còn nguyên; unit
  test cho model + hit-test; E2E vẽ trendline bằng chuột thật (Playwright mouse). Ước lượng:
  ~4–6 phiên, **tách ≥2 PR** (hạ tầng + horizontal line trước, trendline/Fib sau). Rủi ro cao
  nhất kế hoạch này.

### Đợt 17 — Cảnh báo giá (alerts) — **chặn bởi deploy Supabase thật**

1. Schema `alerts` (symbol, điều kiện vượt lên/xuống mức giá, trạng thái, RLS theo user) +
   Supabase Auth tối thiểu (đăng nhập để có alert theo người dùng — quyết định cần người dùng
   chốt: có làm auth ở đợt này không, hay v1 alert lưu local + kiểm tra khi mở trang).
2. Edge Function kiểm tra định kỳ (pg_cron sẵn có từ ingestion) + kênh thông báo v1: Web Push
   hoặc email (chốt ở ADR khi làm).
3. UI: đặt alert bằng chuột phải/nút trên chart tại mức giá, danh sách alert đang hoạt động.

- Chỉ khả thi sau khi hoàn tất "Nợ kỹ thuật" deploy (project Supabase thật, `TWELVEDATA_API_KEY`,
  pg_cron chạy ingestion thật). Nếu người dùng muốn sớm hơn: làm **v1 client-side** (kiểm tra khi
  tab đang mở, Notification API) — không cần deploy, giá trị thấp hơn nhưng có ngay.

## 4. Thứ tự & cổng

- Thứ tự đề xuất: **14 → 15 → 16 → 17** (17 có thể chen bất kỳ lúc nào deploy thật xong).
- Mỗi đợt: cổng commit/merge đầy đủ (mục 5–7 CLAUDE.md), kiểm chứng thật bằng trình duyệt
  (screenshot cả 2 theme), Lighthouse không tụt (LCP ≤ 2.5s — chú ý Đợt 16 thêm JS), E2E xanh
  desktop+mobile, cập nhật `PROGRESS.md` + FEATURE-MAP nếu có.
- Quyết định cần ADR: Đợt 16 (drawing primitives), Đợt 17 (auth + kênh thông báo).

## 5. Rủi ro chính

| Rủi ro                                            | Đối phó                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| Drawing tools phình phạm vi (Đợt 16)              | Khóa v1 = 3 công cụ; tách PR; ADR chốt trước          |
| Bundle/hiệu năng tăng (nhiều series + primitives) | Đo Lighthouse trước–sau mỗi đợt; lazy-load phần vẽ    |
| Heikin Ashi/so sánh % sai công thức               | Unit test giá trị tính tay (quy trình sẵn có Đợt 3/6) |
| Alerts phụ thuộc hạ tầng chưa có                  | Xếp cuối; phương án v1 client-side nếu cần sớm        |
| Mobile: thanh vẽ + watchlist chật màn hình        | Thiết kế mobile-first qua `/ui-ux` trước khi code UI  |

## 6. Ngoài phạm vi (hoãn có chủ đích)

- **Bar replay** (tua lại lịch sử từng nến): giá trị luyện tập cao nhưng cần kiến trúc phát lại
  dữ liệu riêng — xét sau khi Đợt 14–16 xong.
- **Multi-chart layout** (2×2 chart đồng bộ crosshair): đợi nhu cầu thật; lightweight-charts
  hỗ trợ sync qua API nhưng UI phức tạp.
- Pine Script/chỉ báo tùy biến bằng code người dùng, social/ý tưởng cộng đồng, tích hợp
  broker/paper trading: **không làm** — khác bản chất sản phẩm.

## 7. Việc cần người dùng chốt trước khi bắt đầu

1. Duyệt thứ tự 14→17 (hay đổi ưu tiên — ví dụ cần vẽ trendline trước tiện ích Đợt 14?).
2. Đợt 17: chọn **(a)** chờ deploy Supabase thật + auth đầy đủ, hay **(b)** làm v1 client-side
   trước (không cần deploy).
3. Đợt 15 watchlist: chỉ localStorage (chưa cần tài khoản) — xác nhận chấp nhận không đồng bộ
   giữa thiết bị ở v1.
