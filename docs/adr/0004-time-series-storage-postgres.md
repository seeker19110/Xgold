# ADR-0004: Lưu dữ liệu nến bằng Postgres thuần — không dùng TimescaleDB

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-03
- **Liên quan:** KHUNG-3 (research-first), `PROJECT.md` mục 5, ADR-0001 (stack Supabase/Postgres)

## Bối cảnh

Dữ liệu nến (`candles`) là time-series, thường gợi ý dùng extension chuyên biệt như TimescaleDB
(hypertable, nén, continuous aggregate). Cần quyết định có dùng TimescaleDB trên Supabase hay không.

## Quyết định

Dùng **bảng Postgres thuần** (`candles`, khóa chính tổng hợp `(instrument_id, timeframe, ts)`,
index theo truy vấn hay dùng) — **không bật TimescaleDB**. Resample khung lớn hơn (4h, 1W) tính từ
khung nhỏ hơn (1h, 1D) bằng SQL/`date_trunc` hoặc client-side, không dùng continuous aggregate.

## Lý do

- **Khối lượng dữ liệu nhỏ ở quy mô MVP:** nến 1h ≈ 6.200 dòng/năm/symbol; 5 năm daily ≈ 1.300 dòng —
  Postgres thuần với index đúng đã đủ nhanh, chưa tới ngưỡng cần hypertable/nén.
- **TimescaleDB đã bị deprecated trên Supabase ở Postgres 17** (đã xác minh qua tài liệu chính thức
  `supabase.com/docs/guides/database/extensions/timescaledb` ngày 2026-07-03: "timescaledb extension
  is deprecated in projects using Postgres 17... sẽ cần drop trước khi nâng lên PG17") — bắt đầu dự án
  mới bằng một extension đã có lộ trình khai tử là rủi ro không cần thiết.
- **Đơn giản hơn = ít bề mặt lỗi hơn:** đúng nguyên tắc "không cách tân đồng thời ở nhiều tầng nền
  móng" (ADR-0001) — Postgres thuần đã được kiểm chứng rộng rãi, không cần học thêm mô hình hypertable.

## Các phương án đã cân nhắc

- **TimescaleDB** — mạnh cho time-series khối lượng lớn (nén, continuous aggregate tự động), nhưng
  đã deprecated trên Supabase PG17, và khối lượng dữ liệu MVP chưa cần tới các lợi ích đó; loại.
- **Bảng Postgres thuần (chọn)** — đơn giản, đủ nhanh ở quy mô hiện tại, không phụ thuộc extension có
  rủi ro khai tử.

## Hệ quả

**Tích cực:** không phụ thuộc extension sắp bị loại bỏ; schema đơn giản, dễ hiểu, dễ backup/migrate;
đủ hiệu năng cho quy mô MVP.

**Đánh đổi / rủi ro phải chấp nhận:** nếu sau này mở rộng nhiều symbol + khung nhỏ (1m/5m) trong nhiều
năm, khối lượng dòng có thể tăng đáng kể — khi đó cân nhắc partition theo thời gian (native Postgres
partitioning, không cần TimescaleDB) thay vì hypertable.

**Việc cần làm tiếp:** theo dõi số dòng `candles` theo thời gian; nếu vượt ngưỡng ảnh hưởng hiệu năng
truy vấn (ước lượng hàng triệu dòng/bảng), viết ADR mới đánh giá lại (native partitioning là lựa chọn
đầu tiên, không quay lại TimescaleDB do đã deprecated).
