-- ============================================================================
-- Schema Xgold: instruments (symbol theo dõi) + candles (nến OHLC) + ingest_runs
-- (log mỗi lần thu thập dữ liệu). Xem PROJECT.md mục 5, ADR-0003, ADR-0004.
--
-- Nguyên tắc (KHUNG 1 GĐ 2, đã áp dụng):
--   • Ràng buộc đầy đủ: NOT NULL, CHECK, khóa ngoại + ON DELETE.
--   • Index cho truy vấn hay dùng (đọc nến theo instrument+timeframe+khoảng thời gian).
--   • Thời gian UTC (timestamptz).
--   • Giá dùng numeric (KHÔNG float) — ADR-0004.
--   • Row Level Security BẬT: dữ liệu giá là công khai (không thuộc sở hữu người dùng) nên
--     policy SELECT mở cho mọi role đọc; KHÔNG có policy INSERT/UPDATE/DELETE cho client —
--     chỉ service_role (bỏ qua RLS theo mặc định Supabase) mới ghi được, dùng trong Edge Function.
--
-- Vòng đời migration: xem docs/framework/quality-supplements.md Nhóm 1 mục 2.
-- ============================================================================

create table if not exists public.instruments (
  id             uuid primary key default gen_random_uuid(),
  symbol         text not null unique,
  name           text not null,
  type           text not null default 'commodity',
  currency       text not null default 'USD',
  source_config  jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create table if not exists public.candles (
  instrument_id uuid not null references public.instruments (id) on delete cascade,
  timeframe     text not null check (timeframe in ('1h', '4h', '1D', '1W')),
  ts            timestamptz not null,
  open          numeric not null,
  high          numeric not null,
  low           numeric not null,
  close         numeric not null,
  volume        numeric,
  source        text not null,
  created_at    timestamptz not null default now(),
  primary key (instrument_id, timeframe, ts),
  check (high >= low),
  check (high >= open and high >= close),
  check (low <= open and low <= close)
);

-- Khóa chính (instrument_id, timeframe, ts) đã là btree đúng thứ tự cho truy vấn chính
-- ("lấy nến của 1 symbol, 1 khung, trong 1 khoảng thời gian, sắp theo ts") — không cần index riêng.

create table if not exists public.ingest_runs (
  id             uuid primary key default gen_random_uuid(),
  instrument_id  uuid not null references public.instruments (id) on delete cascade,
  provider       text not null,
  timeframe      text not null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running', 'success', 'error')),
  rows_upserted  integer not null default 0,
  error          text
);

create index if not exists ingest_runs_instrument_started_at_idx
  on public.ingest_runs (instrument_id, started_at desc);

-- ── Row Level Security ──
-- Mặc định khi bật RLS là TỪ CHỐI tất cả; khai policy SELECT mở (dữ liệu giá công khai).
-- Không có policy INSERT/UPDATE/DELETE cho anon/authenticated — chỉ service_role ghi được.
alter table public.instruments enable row level security;
alter table public.candles enable row level security;
alter table public.ingest_runs enable row level security;

create policy "instruments_select_all"
  on public.instruments for select
  to anon, authenticated
  using (true);

create policy "candles_select_all"
  on public.candles for select
  to anon, authenticated
  using (true);

-- ingest_runs là log vận hành nội bộ — KHÔNG cho anon/authenticated đọc (không tạo policy SELECT
-- cho các role này); chỉ service_role (Edge Function, dashboard) truy cập được.

-- RLS chỉ LỌC HÀNG, không tự cấp quyền — vẫn cần GRANT ở tầng bảng thì policy SELECT mới có tác dụng.
-- Khai tường minh (không dựa vào default privileges ngầm định của Supabase) để migration tự đủ,
-- không phụ thuộc cấu hình nền tảng không ghi lại ở đây. Chỉ SELECT — không GRANT insert/update/delete.
grant usage on schema public to anon, authenticated;
grant select on public.instruments, public.candles to anon, authenticated;

-- ── Seed: symbol XAU/USD (vàng thế giới) ──
insert into public.instruments (symbol, name, type, currency)
values ('XAUUSD', 'Gold Spot (XAU/USD)', 'commodity', 'USD')
on conflict (symbol) do nothing;
