-- ============================================================================
-- Đợt 5 (Should have): giá vàng trong nước — domestic_gold_prices (mua/bán theo
-- vendor+product) + domestic_gold_ingest_runs (log ingest riêng, KHÔNG dùng chung
-- ingest_runs vì bảng đó gắn với instrument_id — vàng trong nước không phải một
-- "instrument" theo mô hình candles). Xem ADR-0005, PROJECT.md mục 5.
--
-- Nguyên tắc giống migration nền (20260703083820_xgold_schema.sql):
--   • Ràng buộc đầy đủ: NOT NULL, CHECK, thời gian UTC (timestamptz), tiền dùng numeric.
--   • RLS bật: SELECT công khai, chỉ service_role ghi (Edge Function).
--   • GRANT tường minh — RLS chỉ lọc hàng, không tự cấp quyền (đã học từ migration trước).
-- ============================================================================

-- Khóa chính composite (vendor, product, ts) — cùng kiểu với candles (instrument_id, timeframe, ts):
-- không cần thêm cột "id" uuid riêng, khóa tự nhiên đã đủ để upsert idempotent.
create table if not exists public.domestic_gold_prices (
  vendor      text not null,
  product     text not null,
  -- "buy" = giá vendor MUA vào (trả cho khách bán), "sell" = giá vendor BÁN ra (khách mua) —
  -- quy ước bán lẻ vàng trong nước: sell luôn >= buy (đây là ràng buộc nghiệp vụ chung của thị
  -- trường vàng bán lẻ VN, không phụ thuộc định dạng riêng của một API cụ thể nào).
  buy         numeric not null check (buy > 0),
  sell        numeric not null check (sell >= buy),
  ts          timestamptz not null,
  source      text not null,
  created_at  timestamptz not null default now(),
  primary key (vendor, product, ts)
);

create index if not exists domestic_gold_prices_vendor_ts_idx
  on public.domestic_gold_prices (vendor, product, ts desc);

create table if not exists public.domestic_gold_ingest_runs (
  id             uuid primary key default gen_random_uuid(),
  vendor         text not null,
  provider       text not null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running', 'success', 'error')),
  rows_upserted  integer not null default 0,
  error          text
);

create index if not exists domestic_gold_ingest_runs_vendor_started_at_idx
  on public.domestic_gold_ingest_runs (vendor, started_at desc);

-- ── Row Level Security ──
alter table public.domestic_gold_prices enable row level security;
alter table public.domestic_gold_ingest_runs enable row level security;

create policy "domestic_gold_prices_select_all"
  on public.domestic_gold_prices for select
  to anon, authenticated
  using (true);

-- domestic_gold_ingest_runs là log vận hành nội bộ — KHÔNG tạo policy SELECT cho anon/authenticated
-- (giống ingest_runs hiện có) — chỉ service_role truy cập được.

grant usage on schema public to anon, authenticated;
grant select on public.domestic_gold_prices to anon, authenticated;
