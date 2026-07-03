# ADR-0006: vang.today làm nguồn dự phòng cho domestic-gold (bổ sung ADR-0005)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-04
- **Liên quan:** ADR-0005 (hoãn vang.today vì chưa xác minh được response thật)

## Bối cảnh

ADR-0005 hoãn `vang.today` làm nguồn thứ 2 vì lúc đó chỉ có mô tả JSON qua `WebSearch` (không trích
dẫn xác minh được, nghi ngờ model tìm kiếm tự suy đoán field) — vi phạm nguyên tắc chống ảo giác
(CLAUDE.md mục 4). Phiên này, `WebFetch` gọi thẳng được domain tài chính (khác ADR-0005, lúc đó bị
chặn 403 qua agent proxy) — cho phép xác minh thật bằng response sống.

## Quyết định

- **Xác nhận bằng lời gọi thật** (không phải tóm tắt qua search) tới
  `GET https://www.vang.today/api/prices` (không cần key), nhận về JSON thật ngày 2026-07-04:

  ```json
  {
    "success": true,
    "timestamp": 1783099805,
    "prices": {
      "SJL1L10": { "name": "SJC 9999", "buy": 148400000, "sell": 151400000, "currency": "VND" },
      "XAUUSD": { "name": "World Gold (XAU/USD)", "buy": 4176.1, "sell": 0, "currency": "USD" }
      // ... 12 mục, xem lib/providers-domestic/vang-today.ts cho danh sách đầy đủ
    }
  }
  ```

- **Thêm `VangTodayProvider`** (`lib/providers-domestic/vang-today.ts`) làm nguồn **dự phòng**, dùng
  khi `BtmcProvider` lỗi (mạng/parse) trong cùng một lần ingest — KHÔNG thay thế BTMC làm nguồn chính.
- **Whitelist tường minh mã sản phẩm → (vendor, product)** dựa đúng 12 mục đã xác nhận sống ở trên —
  KHÔNG suy đoán vendor từ chuỗi `name` lúc chạy (vd tách "DOJI" ra từ "DOJI Hanoi") vì không chắc
  chắn 100% cách đặt tên không đổi. Mã nào không có trong whitelist bị bỏ qua (parse phòng thủ, giống
  `BtmcProvider`), không suy đoán.
- **Loại `XAUUSD`** khỏi output — khác đơn vị tiền (USD, không phải VND), đã có nguồn riêng
  (Twelve Data/Stooq, ADR-0003) cho XAU/USD, đưa vào bảng `domestic_gold_prices` (ràng buộc VND) sẽ
  sai ngữ nghĩa.
- **`ts` dùng field `timestamp` (Unix epoch giây) của response**, không parse chuỗi `date`/`time`
  (`"2026-07-04"`/`"00:30"`) — epoch không mơ hồ múi giờ, chuỗi ngày/giờ thì có (không rõ tài liệu
  xác nhận đó là giờ VN hay UTC).
- Vendor được gán KHÔNG phải `'btmc'` — dù một số mục có tên gần giống ("Bao Tin SJC") không đủ chắc
  chắn đây là cùng công ty Bảo Tín Minh Châu (BTMC) hay một thương hiệu "Bảo Tín" khác. Vendor slug
  dùng nguyên bản: `sjc`, `doji`, `pnj`, `vietinbank`, `bao-tin`, `vn-gold` — tách biệt hoàn toàn khỏi
  `vendor: 'btmc'` để không gán nhầm nguồn gốc dữ liệu tài chính.

## Lý do

- Bằng chứng lần này mạnh hơn hẳn ADR-0005: gọi trực tiếp endpoint và đọc JSON thật, không phải suy
  luận qua tóm tắt tìm kiếm — đúng tiêu chuẩn "xác nhận tồn tại trước khi dùng" (CLAUDE.md mục 4).
- Whitelist tường minh (thay vì parse tên linh hoạt) giữ đúng tinh thần "parse phòng thủ" đã áp dụng
  cho BTMC — ưu tiên bỏ sót một dòng lạ hơn là gán sai vendor cho dữ liệu tài chính.
- vang.today vẫn là **API không tài liệu chính thức, không SLA, không xác thực** — giữ vai trò dự
  phòng (không thay BTMC) để giới hạn rủi ro nếu endpoint đổi/ngừng đột ngột.

## Các phương án đã cân nhắc

| Tiêu chí                       | Dự phòng khi BTMC lỗi (chọn) | Nguồn chính song song với BTMC  | Suy đoán vendor từ `name` |
| ------------------------------ | ---------------------------- | ------------------------------- | ------------------------- |
| Rủi ro trùng lặp/nhiễu dữ liệu | Thấp (chỉ ghi khi BTMC chết) | Cao (2 nguồn cùng ghi, dễ lệch) | —                         |
| Độ chính xác gán vendor        | Cao (whitelist tường minh)   | Cao                             | Thấp (đoán, có thể sai)   |
| **Quyết định**                 | **CHỌN**                     | Không chọn (đợt sau nếu cần)    | Không chọn                |

## Hệ quả

**Tích cực:** ingest domestic-gold có nguồn dự phòng khi BTMC (endpoint chưa xác minh field thật,
theo ADR-0005) gặp sự cố — tăng độ bền của tính năng Should-have mà không tăng rủi ro gán sai dữ liệu.

**Đánh đổi / rủi ro phải chấp nhận:**

- vang.today không có tài liệu chính thức xác nhận field sẽ không đổi — response đã xác minh SỐNG
  ngày 2026-07-04, nhưng vẫn cần parse phòng thủ (bỏ dòng lạ) như đã làm.
- Whitelist 11 sản phẩm (loại XAUUSD) là danh sách CỨNG — nếu vang.today thêm sản phẩm mới, sản phẩm
  đó bị bỏ qua tới khi ai đó cập nhật whitelist (chấp nhận được, an toàn hơn suy đoán sai).
- `ts` dùng chung 1 mốc thời gian toàn batch (response không có timestamp riêng từng sản phẩm) — khác
  BTMC (mỗi dòng có `d_1` riêng). Không ảnh hưởng ràng buộc `PRIMARY KEY(vendor, product, ts)` vì
  vendor/product khác nhau giữa các dòng cùng batch.

**Việc cần làm tiếp theo:** khi deploy Edge Function thật — vẫn phải test `curl` trực tiếp cả 2 nguồn
(BTMC bắt buộc theo ADR-0005; vang.today khuyến nghị dù đã xác minh từ phiên AI, vì môi trường mạng
production Supabase khác sandbox này) trước khi bật `pg_cron` — xem README cập nhật của
`supabase/functions/ingest-domestic-gold/`.
