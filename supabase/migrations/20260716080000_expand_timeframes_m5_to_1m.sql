-- Mở rộng dải khung thời gian chuẩn TradingView: 5m → 15m → 30m → 1h → 4h → 1D → 1W → 1M.
-- Chỉ khung CƠ SỞ (5m/1h/1D) được ghi vào bảng candles (ingest/backfill); các khung còn lại
-- resample lúc đọc (lib/candles/resample.ts). CHECK giữ đủ cả 8 giá trị cho nhất quán với
-- TIMEFRAMES ở lib/candles/types.ts (như bản đầu đã liệt kê cả 4h/1W dù không lưu).
--
-- Rollback: alter table public.candles drop constraint candles_timeframe_check;
--           alter table public.candles add constraint candles_timeframe_check
--             check (timeframe in ('1h', '4h', '1D', '1W'));
-- (chỉ rollback được khi chưa có dòng dữ liệu 5m — nếu có, xoá dữ liệu 5m trước.)

alter table public.candles
  drop constraint candles_timeframe_check;

alter table public.candles
  add constraint candles_timeframe_check
  check (timeframe in ('5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'));
