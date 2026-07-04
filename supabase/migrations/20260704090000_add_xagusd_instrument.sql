-- Seed thêm mã XAG/USD (bạc thế giới) vào bảng instruments.
-- Đợt 9 — Đa symbol: chart tổng quát hoá thành nhiều mã (registry lib/instruments.ts). XAG/USD dùng
-- chung toàn bộ hạ tầng của XAU/USD (bảng candles/ingest_runs, RLS, GRANT đã có ở migration schema
-- gốc 20260703083820) — chỉ cần thêm một dòng instrument, không đổi cấu trúc bảng.
--
-- Idempotent: on conflict do nothing để chạy lại nhiều lần không lỗi (khớp cách seed XAU/USD gốc).

insert into public.instruments (symbol, name, type, currency)
values ('XAGUSD', 'Silver Spot (XAG/USD)', 'commodity', 'USD')
on conflict (symbol) do nothing;
