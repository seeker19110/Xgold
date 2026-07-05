# ADR-0009: Thêm mã DXY (chỉ số đô la Mỹ) và USD/VND vào registry

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-05
- **Liên quan:** ADR-0008 (registry mã + route động, hoãn DXY/USD-VND lúc đó), ADR-0003 (nguồn dữ
  liệu Twelve Data + Stooq — cùng hạn chế mạng sandbox), ADR-0005 (field verification bắt buộc trước
  khi bật pg_cron); backlog `docs/plans/xgold-development-plan.md` mục 5 ("so sánh SJC vs thế giới
  quy đổi" cần USD/VND).

## Bối cảnh

ADR-0008 hoãn DXY và USD/VND khi làm mã thứ hai (XAG/USD) vì "DXY chưa xác minh được ở Stooq,
USD/VND là forex khác nhóm". Nay thêm 2 mã này để mở khoá tiếp tính năng so sánh giá vàng SJC vs thế
giới quy đổi (cần USD/VND) và một chỉ báo vĩ mô tham chiếu phổ biến (DXY). Kiến trúc đa symbol
(registry + route động) đã có sẵn từ Đợt 9 — việc còn lại chỉ là: (1) thêm 2 mục registry (rẻ, đã
chứng minh ở ADR-0008), (2) xác định mã provider (Twelve Data/Stooq) cho 2 mã mới.

**Cùng hạn chế mạng đã ghi ở ADR-0003/0005:** sandbox phát triển hiện tại chặn truy cập trực tiếp
(`curl`/`WebFetch`) tới `api.twelvedata.com` và `stooq.com` (403/timeout) — không gọi thử được để
xác nhận chính xác mã symbol/ticker. Tra cứu qua `WebSearch` (không bị chặn) cho kết quả:

- **Twelve Data / DXY:** tài liệu + kết quả tìm kiếm nêu rõ dùng thẳng `DXY` làm symbol (không phải
  cặp tiền tệ dạng `BASE/QUOTE`).
- **Twelve Data / USD-VND:** VND được xác nhận là tiền tệ Twelve Data hỗ trợ; định dạng cặp tiền
  chuẩn của Twelve Data là `USD/VND` (khớp quy ước `XAU/USD`/`XAG/USD` đã dùng) — **không** gọi API
  thật xác nhận được symbol này tồn tại trong danh sách forex pairs.
- **Stooq / DXY:** tìm thấy ít nhất **2 ticker khác nhau** trên chính trang stooq.com — `dx.f` (hợp
  đồng tương lai ICE) và `usd_i` (chỉ số, trang tiêu đề "U.S. Dollar Index") — không đủ căn cứ chọn
  đúng cái nào khớp khái niệm DXY spot.
- **Stooq / USD-VND:** không tìm thấy bằng chứng trực tiếp (chỉ có suy đoán không xác thực từ nội
  dung tóm tắt tìm kiếm, không phải trích dẫn thật từ trang Stooq).

## Quyết định

- Thêm `DXY` và `USDVND` vào registry `lib/instruments.ts` (đầy đủ: route động, sitemap, trang chủ,
  API `/api/candles`, fixture mẫu, seed migration, E2E) — dùng chung hạ tầng đa symbol có sẵn từ
  Đợt 9, không đổi kiến trúc.
- Mở rộng `Instrument.type` thành `'commodity' | 'index' | 'forex'` và `currency` thành
  `'USD' | 'VND'` (DXY không có đơn vị tiền tệ thật — dùng quy ước `currency: 'USD'` vì chỉ số đo
  sức mạnh đồng đô la).
- **Twelve Data:** thêm `DXY → 'DXY'` và `USDVND → 'USD/VND'` vào `SYMBOL_MAP`
  (`lib/providers/twelvedata.ts`, `supabase/functions/ingest-gold/index.ts`) — mức độ tin cậy vừa
  phải (suy từ tài liệu công khai, CHƯA gọi API thật), gắn nhãn rõ trong code + README bắt buộc kiểm
  tra kỹ ở bước field-verification (giống quy trình BTMC, ADR-0005) trước khi bật `pg_cron` cho 2 mã
  này.
- **Stooq:** **KHÔNG** thêm DXY/USDVND vào `SYMBOL_MAP` (`lib/providers/stooq.ts`) — để nguyên hành
  vi "ném lỗi rõ ràng" (`ProviderError: Không hỗ trợ symbol`) cho 2 mã này thay vì đoán ticker sai.
  Ghi rõ lý do bằng comment tại chỗ. `runBackfillTask`/Edge Function đã có sẵn cơ chế cô lập lỗi theo
  từng job (một job lỗi không chặn job/mã khác) nên việc thiếu Stooq cho 2 mã này chỉ làm giảm phạm
  vi (không có backfill lịch sử dài qua Stooq), không gây lỗi dây chuyền.

## Lý do

- Đoán sai ticker Twelve Data chỉ dẫn tới lỗi rõ ràng (`status: "error"` hoặc HTTP lỗi) — an toàn,
  dễ phát hiện ở bước field-verification bắt buộc đã có sẵn quy trình (README `ingest-gold`).
- Đoán sai ticker Stooq **nguy hiểm hơn**: nếu ticker tồn tại nhưng chỉ khác loại instrument (vd
  `dx.f` là hợp đồng tương lai, không phải chỉ số spot DXY), lỗi sẽ **âm thầm** — vẫn trả về CSV hợp
  lệ, vẫn qua được `CandleSchema`, nhưng là dữ liệu SAI loại tài sản. Đây là rủi ro thầm lặng, khó
  phát hiện bằng test, đi ngược nguyên tắc chống ảo giác (CLAUDE.md §4). An toàn hơn là từ chối rõ
  ràng và chờ xác nhận thật khi deploy có mạng.
- Twelve Data là provider chính cho ingest định kỳ (1h/1D gần nhất, xem ADR-0003) — thiếu Stooq chỉ
  ảnh hưởng tới backfill lịch sử dài, không chặn tính năng cốt lõi (xem chart + phân tích + gợi ý).

## Các phương án đã cân nhắc

- **Đoán cả Stooq (chọn `dx.f` hoặc `usd_i` bừa):** loại — rủi ro dữ liệu sai loại tài sản âm thầm,
  không có cách phát hiện bằng test tự động (chỉ phát hiện khi so giá trị thật với TradingView bằng
  mắt, chậm và dễ bỏ sót).
- **Hoãn cả 2 mã tiếp tục (giữ nguyên ADR-0008):** loại — người dùng đã yêu cầu làm; phần UI/chart
  không phụ thuộc việc xác minh provider (fixture mẫu đủ để demo + phát triển tiếp tính năng so sánh
  SJC vs thế giới), không có lý do trì hoãn phần này.
- **Thêm Stooq nhưng đánh dấu `experimental`/feature-flag:** loại — thêm cơ chế mới (flag) cho một
  rủi ro có thể tránh hoàn toàn bằng cách không đoán; vi phạm nguyên tắc không thêm trừu tượng khi
  chưa cần.

## Hệ quả

**Tích cực:** DXY + USD/VND dùng được ngay trên UI (chart, Multi-MA/RSI, MACD, Bollinger, gợi ý phân
tích) bằng dữ liệu mẫu — đã kiểm chứng thật bằng trình duyệt (screenshot Dark blue + Light, giá trị
hợp lý: DXY quanh 100–106, USD/VND quanh 26.000–28.000). Backlog "so sánh SJC vs thế giới quy đổi"
giờ chỉ còn phần tính toán/UI so sánh, không còn phụ thuộc thêm symbol.

**Đánh đổi / rủi ro phải chấp nhận:**

- Ingestion thật của DXY/USD-VND qua Twelve Data **chưa xác minh bằng gọi API thật** (như mọi mã
  khác trong dự án — nợ kỹ thuật chung, xem `PROGRESS.md`) — **bắt buộc** kiểm tra kỹ theo README
  trước khi bật `pg_cron` cho 2 mã này, kỹ hơn XAU/USD·XAG/USD vì độ tin cậy thấp hơn.
- Stooq backfill lịch sử dài **chưa có** cho DXY/USD-VND có chủ đích — nếu sau này cần, phải xác nhận
  ticker chính xác bằng cách gọi thật (không phải sandbox này) rồi mới thêm vào `SYMBOL_MAP`.
- `Instrument.currency: 'USD'` cho DXY là quy ước hiển thị, không phải đơn vị tiền tệ thật — cần lưu
  ý nếu sau này có tính năng format giá theo `currency` (hiện chưa có, xem `lib/instruments.ts`).
