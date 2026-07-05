-- Seed thêm 2 mã DXY (chỉ số đô la Mỹ) và USD/VND (tỷ giá) vào bảng instruments.
-- Backlog sau Đợt 9 — dùng chung toàn bộ hạ tầng đa symbol (bảng candles/ingest_runs, RLS, GRANT đã
-- có ở migration schema gốc 20260703083820) — chỉ cần thêm dòng instrument, không đổi cấu trúc bảng.
--
-- Idempotent: on conflict do nothing để chạy lại nhiều lần không lỗi (khớp cách seed các mã trước).

insert into public.instruments (symbol, name, type, currency)
values
  ('DXY', 'ICE U.S. Dollar Index (DXY)', 'index', 'USD'),
  ('USDVND', 'Tỷ giá USD/VND', 'forex', 'VND')
on conflict (symbol) do nothing;
