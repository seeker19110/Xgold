# ADR-0012: Công cụ vẽ trên chart (Đợt 16) — tự viết Series Primitives, không dùng gói cộng đồng

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-17
- **Liên quan:** ADR-0002 (lightweight-charts 5.2.0), ADR-0007 (nguyên tắc pure TS/không thêm
  dependency khi chưa có lý do đủ mạnh); `docs/plans/xgold-tradingview-parity-plan.md` Đợt 16

## Bối cảnh

Đợt 16 (parity TradingView) cần công cụ vẽ trên chart: đường ngang, trendline, Fibonacci
retracement. `lightweight-charts` v5 (bản Xgold đang dùng) **không có** drawing tools sẵn — phải
tự làm bằng **Series Primitives / Pane Primitives**, API plugin chính thức của v5
(`ISeriesPrimitive`, `series.attachPrimitive()` — đã xác nhận tồn tại trong
`node_modules/lightweight-charts/dist/typings.d.ts` bản 5.2.0 đang cài, dòng 2589–2598). Kế hoạch
gốc yêu cầu bắt buộc research-first + ADR trước khi code (tránh tự chế kiến trúc giữa chừng).

## Quyết định

**Tự viết primitives** cho v1 (đường ngang, trendline, Fibonacci retracement) — không cài gói
cộng đồng nào.

## Các phương án đã cân nhắc (xác minh qua npm registry API 2026-07-17, không đoán)

| Gói                                               | Phiên bản mới nhất | Ngày publish | peerDep `lightweight-charts` | Downloads/tháng (npm API)   | Đánh giá                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------ | ------------ | ---------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lightweight-charts-drawing` (deepentropy)        | 0.1.1              | 2026-02-26   | `^5.0.0` (khớp v5 đang dùng) | Không có dữ liệu (API rỗng) | Kiến trúc đúng hướng (peer dep đúng) nhưng **pre-1.0, một tác giả duy nhất, không có tín hiệu ai dùng** — rủi ro chuỗi cung ứng cho tính năng chồng lên dữ liệu giá thật người dùng ra quyết định giao dịch                               |
| `lightweight-charts-line-tools` (difurious/baotm) | 4.1.1              | 2024-09-08   | **Không khai báo**           | Không có dữ liệu (API rỗng) | Không có `peerDependencies` + tự mang `fancy-canvas@0.2.2` (bản cũ, khác bản `lightweight-charts` 5.2.0 dùng) → dấu hiệu đây là **fork trọn gói bản cũ**, không phải plugin gắn thêm vào v5 hiện có — sẽ đụng độ 2 bản chart-lib cùng lúc |
| Tự viết (chọn)                                    | –                  | –            | –                            | –                           | Kiểm soát hoàn toàn, khớp đúng phiên bản 5.2.0, không phụ thuộc bên ngoài chưa kiểm chứng                                                                                                                                                 |

Thảo luận chính thức từ chủ dự án `tradingview/lightweight-charts` (Discussion #1466, "Interactive
Drawing Tools Build Complete - Plugin Conversion Needed") xác nhận: bản thân TradingView **chưa có**
plugin drawing tools chính thức cho v5 — hệ sinh thái cộng đồng vẫn đang hình thành, chưa có lựa
chọn nào đủ trưởng thành.

## Lý do

- **Phạm vi v1 nhỏ** (3 công cụ: đường ngang, trendline, Fibonacci retracement) — đủ nhỏ để tự viết
  bằng đúng API chính thức (`ISeriesPrimitive`) mà không cần một thư viện 68-công-cụ (`deepentropy`)
  chỉ dùng 3.
- **Rủi ro chuỗi cung ứng không đáng đánh đổi**: đây là tính năng hiển thị trực tiếp trên dữ liệu
  giá — một lỗi tọa độ/render từ gói bên ngoài (đặc biệt gói pre-1.0, 1 người bảo trì, không dữ liệu
  sử dụng) khó phát hiện hơn code tự viết có unit test.
- **Nhất quán ADR-0007**: dự án đã chọn tự viết mọi thứ domain-specific (indicator, engine phân
  tích) — công cụ vẽ với model tọa độ theo `time+price` (không theo pixel) cũng là logic cần kiểm
  soát chặt để sống sót qua zoom/pan/đổi timeframe, không khác bản chất so với engine đã tự viết.
- **`lightweight-charts-line-tools` không khả thi về kỹ thuật** — cấu trúc gói cho thấy đây là fork
  toàn bộ thư viện chart ở bản cũ hơn, cài thêm vào sẽ tạo 2 bản `lightweight-charts` xung đột.

## Hệ quả

**Tích cực:** kiểm soát hoàn toàn hành vi (tọa độ, hit-test, lưu trữ), không phụ thuộc gói pre-1.0
chưa kiểm chứng, nhất quán nguyên tắc dự án.

**Đánh đổi / rủi ro phải chấp nhận:**

- Tự chịu trách nhiệm đúng đắn hit-test + toạ độ theo `time`/`price` (không phải pixel) — giảm
  thiểu bằng unit test cho model + test tính tay tọa độ Fibonacci, E2E vẽ bằng chuột thật
  (Playwright mouse) xác nhận sống sót qua zoom/pan/đổi khung.
- Phạm vi v1 khóa cứng ở 3 công cụ — không mở rộng thêm (Gann, pitchfork...) trừ khi có ADR mới.
- Nếu sau này hệ sinh thái cộng đồng trưởng thành hơn (gói ổn định, nhiều người dùng, còn bảo trì),
  có thể viết ADR mới đánh giá lại — không có nghĩa quyết định này vĩnh viễn.
- Việc cần làm tiếp theo: xem `docs/plans/xgold-tradingview-parity-plan.md` Đợt 16 mục 1–3 cho phạm
  vi kỹ thuật chi tiết (lớp `lib/drawings/`, primitive renderer, thanh công cụ).
