# ADR-0005: Nguồn dữ liệu giá vàng trong nước — BTMC (chính), vang.today/SJC hoãn

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-03
- **Liên quan:** ADR-0003 (nguồn XAU/USD thế giới), `PROJECT.md` mục 2 "Should have" + mục 10,
  `docs/plans/xgold-mvp-plan.md` mục 6 (Đợt 5) + mục 8 (rủi ro)

## Bối cảnh

Đợt 5 (Should have) cần nguồn giá vàng trong nước (mua/bán theo vendor — SJC, BTMC...) để hiển thị
bảng + line chart, khác biệt với TradingView (`PROJECT.md` mục 1). Ràng buộc giống ADR-0003: cần
nguồn xác nhận tồn tại thật (không bịa API — CLAUDE.md mục 4), nhưng **sandbox hiện tại chặn outbound
trực tiếp** tới mọi domain tài chính (đã xác minh lại: `WebFetch` tới `btmc.vn`, `vang.today` đều trả
`403` qua agent proxy). Khác với ADR-0003 (Twelve Data có tài liệu chính thức ổn định, đọc được qua
`WebFetch`), lần này **không đọc được tài liệu gốc** — chỉ có `WebSearch` (tóm tắt qua model tìm kiếm,
độ tin cậy thấp hơn đọc trực tiếp).

## Quyết định

- **Nguồn chính (đợt 5):** **BTMC** (`Bảo Tín Minh Châu`) — endpoint dạng
  `http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=<key>`, trả XML mỗi dòng gồm thuộc tính tên sản
  phẩm, giá mua (`pb_1`), giá bán (`ps_1`), thời điểm cập nhật (`d_1`). Endpoint này được **nhiều
  nguồn độc lập** nhắc tới giống hệt nhau qua nhiều năm (dự án Arduino/IoT thật dùng đúng URL này gọi
  trực tiếp, nhiều bài hướng dẫn dev Việt Nam khác) — độ tin cậy **trung bình-cao** nhưng **chưa đọc
  được response thật** trong sandbox này.
- **vang.today (JSON, không cần key) — HOÃN, không code trong đợt này.** `WebSearch` trả về một mẫu
  JSON cụ thể (`type_code`/`buy`/`sell`/`change_buy`...) nhưng **không kèm nguồn trích dẫn xác minh
  được** (không phải trích trực tiếp từ trang tài liệu, có dấu hiệu model tìm kiếm tự tổng hợp/suy
  đoán) — **không đủ tin cậy để hard-code vào adapter production** (CLAUDE.md mục 4: "không bịa
  API/định dạng response"). Để làm nguồn thứ 2 sau này: xác minh bằng `curl` thật khi deploy (ngoài
  sandbox), rồi mới viết adapter.
- **SJC feed XML chính thức** — không theo đuổi trong đợt này (tài liệu plan đã ghi "hay đổi cấu
  trúc", chưa tìm được endpoint xác nhận được).
- Giữ nguyên **adapter pattern** như ADR-0003 (`lib/providers-domestic/`), interface riêng
  (`DomesticGoldProvider`) khác `CandleProvider` (dữ liệu là mua/bán theo vendor+product, không phải
  OHLC).
- Adapter BTMC parse **phòng thủ** (Zod validate từng dòng, bỏ qua dòng lỗi thay vì crash toàn bộ) và
  ghi rõ trong code + README Edge Function: **BẮT BUỘC** test bằng `curl` thật ngay sau khi deploy
  (đối chiếu field thật với field đã giả định), trước khi tin tưởng và bật `pg_cron`.

## Lý do

- Endpoint BTMC có bằng chứng sử dụng thật độc lập (không chỉ một bài blog) → rủi ro thấp hơn hẳn so
  với vang.today (chỉ có một nguồn tóm tắt không xác minh được).
- Không hard-code một schema **không xác minh được nguồn** — vi phạm trực tiếp nguyên tắc chống ảo
  giác của dự án; thà giao ít hơn (1 nguồn thay vì 2) còn hơn code sai lặng lẽ rồi ingest dữ liệu rác
  vào CSDL production.
- Adapter pattern đã chứng minh hiệu quả ở ADR-0003 — thêm nguồn thứ 2 sau này (vang.today, SJC) không
  đụng phần còn lại một khi đã xác minh thật.

## Các phương án đã cân nhắc

| Tiêu chí                         | BTMC (XML)                                      | vang.today (JSON)                                    | SJC XML chính thức           |
| -------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| Endpoint xác nhận tồn tại thật   | ✅ nhiều nguồn độc lập (kể cả code thật)        | ⚠️ chỉ tóm tắt qua search, không trích dẫn được      | ❌ chưa tìm được endpoint rõ |
| Cần API key                      | ✅ có (dạng key public trong URL mẫu)           | ✅ không cần key                                     | —                            |
| Định dạng response xác minh được | ⚠️ trung bình (nhiều nguồn khớp nhau)           | ❌ thấp (nghi model tìm kiếm tự suy đoán field)      | ❌                           |
| **Quyết định**                   | **CHỌN — có adapter, cần test thật khi deploy** | **HOÃN — chỉ code khi xác minh được bằng curl thật** | **HOÃN**                     |

## Hệ quả

**Tích cực:** giao được khung UI + schema + polling + freshness badge đầy đủ cho Đợt 5 mà không phải
chờ; adapter pattern chừa chỗ thêm vang.today/SJC sau khi xác minh thật.

**Đánh đổi / rủi ro phải chấp nhận:**

- Field XML của BTMC (`n_1/k_1/h_1/pb_1/ps_1/d_1`) **chưa được xác nhận bằng response thật** — parser
  viết theo mô tả tổng hợp từ nhiều nguồn, có thể sai lệch nhỏ (tên field, định dạng ngày). Edge
  Function `ingest-domestic-gold` **không được bật `pg_cron`** cho tới khi test `curl` thật xác nhận
  field khớp.
- MVP Đợt 5 chỉ có **một** nguồn (BTMC) thay vì "đa nguồn" như dự tính ban đầu trong
  `docs/plans/xgold-mvp-plan.md` §8 — rủi ro "nguồn chết" cao hơn kế hoạch gốc, chấp nhận được vì đây
  là tính năng Should have, không chặn MVP.

**Việc cần làm tiếp:** khi deploy thật — chạy `curl` trực tiếp BTMC endpoint, đối chiếu field thật với
`lib/providers-domestic/btmc.ts`, sửa nếu lệch; sau đó cân nhắc thêm vang.today làm nguồn dự phòng
(theo đúng quy trình: đọc tài liệu/response thật trước, không suy đoán).
