# ADR-0003: Nguồn dữ liệu giá vàng XAU/USD — Twelve Data (chính) + Stooq (backfill)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-03
- **Liên quan:** KHUNG-3 (research-first), `PROJECT.md` mục 4 & 6, `docs/plans/xgold-mvp-plan.md`

## Bối cảnh

MVP cần nguồn dữ liệu OHLC XAU/USD **chuẩn** (không tự bịa/lấy nguồn không rõ ràng), miễn phí ở giai
đoạn đầu, đủ cho: (a) nến intraday khung 1h, (b) backfill lịch sử daily ≥ 5 năm. Ràng buộc: ngân sách
$0 lúc khởi điểm (KHUNG-3 §B1), cần API chính thức có tài liệu rõ để validate response bằng Zod.

## Quyết định

- **Nguồn chính (nến 1h + quote gần thời gian thực):** **Twelve Data** — free tier 800 credits/ngày,
  8 request/phút (đã xác minh qua tài liệu chính thức `twelvedata.com/pricing` ngày 2026-07-03).
- **Backfill lịch sử daily dài:** **Stooq** (CSV, không cần API key).
- Thiết kế **adapter pattern** (`lib/providers/`): mỗi nguồn implement cùng một interface
  (`fetchCandles(symbol, timeframe, range) → Candle[]`), validate response bằng Zod trước khi dùng —
  đổi/thêm nguồn sau này không đụng phần còn lại của hệ thống.

## Lý do

- **Twelve Data** có endpoint `time_series` hỗ trợ XAU/USD ở nhiều khung (1min–1month), là API
  thương mại chính thống (không phải scraping), free tier đủ cho tần suất thu thập MVP (ước tính
  ~315/800 credits mỗi ngày — dư địa an toàn, xem `PROJECT.md` mục 10).
- **Stooq** miễn phí, không cần đăng ký, dữ liệu daily dài — hợp cho backfill một lần, giảm phụ thuộc
  vào credits Twelve Data cho việc nạp lịch sử.
- **Adapter pattern** đúng nguyên tắc DRY + chuẩn bị cho rủi ro đã biết: nguồn miễn phí có thể đổi
  điều khoản/giới hạn (`PROJECT.md` mục 10) — cô lập rủi ro vào một lớp mỏng, không lan ra toàn app.

## Các phương án đã cân nhắc

| Tiêu chí                     | Twelve Data         | Stooq              | Alpha Vantage             | Metals-API/GoldAPI   | Yahoo Finance (không chính thức)                                                |
| ---------------------------- | ------------------- | ------------------ | ------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| XAU/USD OHLC intraday        | ✅ 1min–1month      | ⚠️ daily là chính  | ⚠️ có nhưng giới hạn thấp | ❌ chỉ spot          | ✅ (mã GC=F)                                                                    |
| Free tier                    | ✅ 800 credits/ngày | ✅ không cần key   | ❌ ~25 req/ngày           | ❌ ~50–100 req/tháng | ⚠️ không có SLA                                                                 |
| API chính thống, có tài liệu | ✅                  | ✅                 | ✅                        | ✅                   | ❌ unofficial, dễ gãy bất kỳ lúc nào                                            |
| **Vai trò trong Xgold**      | **Nguồn chính**     | **Backfill daily** | Không chọn                | Không chọn           | Không chọn (rủi ro gãy không báo trước, không phù hợp nguyên tắc "nguồn chuẩn") |

- _Alpha Vantage_ — giới hạn free quá thấp (~25 request/ngày) cho tần suất cần thiết.
- _Metals-API/GoldAPI_ — chỉ trả giá spot hiện tại, không có OHLC lịch sử theo khung — không đáp ứng
  yêu cầu chart nến.
- _Yahoo Finance không chính thức_ — không phải API công bố chính thức, vi phạm nguyên tắc "lấy nguồn
  chuẩn" của yêu cầu ban đầu; loại.

## Hệ quả

**Tích cực:** dữ liệu từ API chính thống, có tài liệu, validate được bằng Zod; chi phí $0 ở MVP;
cô lập rủi ro đổi nguồn vào adapter.

**Đánh đổi / rủi ro phải chấp nhận:**

- Free tier có thể đổi điều khoản — theo dõi qua `ingest_runs` sau khi deploy, cảnh báo khi tỉ lệ lỗi
  tăng bất thường (khả năng do rate-limit).
- **Môi trường phát triển hiện tại (sandbox) chặn outbound tới cả Twelve Data lẫn Stooq** (đã xác minh
  bằng `curl` thật: cả hai trả `403 CONNECT tunnel failed` qua agent proxy ngày 2026-07-03) — adapter
  được viết đầy đủ + unit test bằng response mẫu cố định (fixture); gọi API thật chỉ kiểm chứng được
  khi deploy lên hạ tầng Supabase (không bị giới hạn mạng của sandbox này).

**Việc cần làm tiếp:** khi deploy thật, đăng ký `TWELVEDATA_API_KEY` (free) và đặt làm secret của
Supabase Edge Function; chạy thử `ingest-gold` thật một lần, đối chiếu `ingest_runs`.
