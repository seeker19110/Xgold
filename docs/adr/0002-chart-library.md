# ADR-0002: Chọn thư viện vẽ chart — lightweight-charts (TradingView)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-03
- **Liên quan:** KHUNG-3 (research-first), `PROJECT.md` mục 4 & 6, `docs/plans/xgold-mvp-plan.md`

## Bối cảnh

Xgold cần vẽ chart nến kiểu TradingView với nhiều đường trung bình động chồng lên nến (Multi-MA)
và một pane phụ vẽ nhiều đường RSI (Multi-RSI) — bắt buộc thư viện phải hỗ trợ **nhiều pane** trong
cùng một chart, license phù hợp để dùng thương mại tự do, và đủ phổ biến để có tài liệu/cộng đồng.

## Quyết định

Dùng **`lightweight-charts`** (chính chủ TradingView) — **phiên bản 5.2.0** (đã xác minh bằng
`npm registry` ngày 2026-07-03; xác nhận thêm qua tài liệu chính thức và release notes GitHub).

## Lý do

- **Chính chủ TradingView, chuyên biệt cho chart tài chính** — cùng "họ" với chart TradingView thật,
  đúng tinh thần "phát triển phần mềm như TradingView" mà dự án hướng tới.
- **Multi-pane từ v5** — API `chart.addSeries(SeriesType, options, paneIndex)` tự tạo pane mới,
  `chart.panes()`, `series.moveToPane()`, `chart.removePane()` (đã xác nhận qua tài liệu chính thức
  `tradingview.github.io/lightweight-charts/docs/panes` ngày 2026-07-03) — đáp ứng đúng nhu cầu đặt
  Multi-RSI ở pane riêng dưới nến.
- **License Apache-2.0** — dùng thương mại tự do, không cần đăng ký/chờ duyệt (khác TradingView
  Advanced Charts là closed-source).
- **Bundle nhỏ (~45KB)** — phù hợp ngân sách Core Web Vitals (LCP/CLS) đã cam kết ở `PROJECT.md` mục 3.
- **Cộng đồng/độ phổ biến lớn** — cân bằng "phổ biến ↔ năng lực" theo KHUNG-3 §B2.

## Các phương án đã cân nhắc

| Tiêu chí                        | lightweight-charts 5.2.0 | TradingView Advanced Charts    | ECharts 6.1.0               | klinecharts 10.0.0-beta3 |
| ------------------------------- | ------------------------ | ------------------------------ | --------------------------- | ------------------------ |
| Chuyên chart tài chính          | ✅ chính chủ TradingView | ✅ đầy đủ nhất                 | ⚠️ tổng quát, tự dựng nhiều | ✅                       |
| License                         | ✅ Apache-2.0            | ❌ closed-source, phải đăng ký | ✅ Apache-2.0               | ✅ Apache-2.0            |
| Multi-pane cho RSI              | ✅ từ v5                 | ✅                             | ⚠️ tự dựng grid             | ✅                       |
| Phiên bản ổn định (KHUNG-3 §B4) | ✅ 5.2.0 stable          | —                              | ✅                          | ❌ **đang beta** — loại  |
| Bundle size                     | ✅ nhỏ (~45KB)           | ❌ nặng hơn nhiều              | ❌ nặng hơn                 | ✅ nhỏ                   |

- _TradingView Advanced Charts_ — mạnh nhất (vẽ trendline, nhiều công cụ hơn) nhưng closed-source,
  phải đăng ký & chờ duyệt truy cập mã nguồn; cân nhắc lại nếu sau MVP cần công cụ vẽ tay.
- _ECharts_ — phổ biến, nhưng không chuyên biệt tài chính, phải tự dựng bố cục multi-pane bằng grid
  thủ công, bundle nặng hơn.
- _klinecharts_ — nhắm đúng chart tài chính và có multi-pane, nhưng bản mới nhất đang **beta**
  (`10.0.0-beta3`), vi phạm quy tắc chọn phiên bản KHUNG-3 §B4 ("không alpha/beta/RC cho production").

## Hệ quả

**Tích cực:** vẽ được đúng yêu cầu Multi-MA (pane giá) + Multi-RSI (pane phụ) mà không cần tự dựng
bố cục; license tự do; bundle nhỏ giúp giữ ngân sách hiệu năng.

**Đánh đổi / rủi ro phải chấp nhận:**

- API pane còn tương đối mới (ra mắt cùng v5) — giảm rủi ro bằng cách viết prototype pane RSI sớm ở
  Đợt 3 (`docs/plans/xgold-mvp-plan.md`) trước khi mở rộng thêm đường.
- Không có sẵn công cụ vẽ tay (trendline...) — nằm trong "Won't have" của MVP (`PROJECT.md` mục 2),
  không phải rào cản hiện tại.

**Việc cần làm tiếp:** khi triển khai Đợt 2–3, xác nhận lại chữ ký API pane bằng file `.d.ts` đã cài
(offline, chuẩn) trước khi dùng — tránh bịa API theo trí nhớ (CLAUDE.md §4).
