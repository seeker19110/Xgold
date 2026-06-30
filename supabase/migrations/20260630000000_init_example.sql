-- ============================================================================
-- Migration MẪU (đã điền) — minh họa "migration có phiên bản + RLS" của khung.
-- Đây là VÍ DỤ tham chiếu (giống ADR-0001 cho stack). Dự án thật THAY bằng schema
-- riêng, nhưng giữ đúng các nguyên tắc KHUNG 1 (GĐ 2 — Thiết kế CSDL):
--   • Ràng buộc đầy đủ: NOT NULL, CHECK, khóa ngoại + ON DELETE.
--   • Index cho cột hay lọc/sắp xếp/join.
--   • Thời gian dùng UTC (timestamptz) — KHÔNG dùng timestamp không múi giờ.
--   • id dùng uuid; tiền (nếu có) dùng số nguyên/decimal, KHÔNG float.
--   • Row Level Security BẬT ngay từ thiết kế + policy theo chủ sở hữu.
--
-- Vòng đời migration (xem docs/framework/BO-SUNG-chat-luong-Nhom-1.md mục 2):
--   Tạo:           npx supabase migration new ten_thay_doi
--   Áp dụng local: npx supabase db reset
--   Đẩy prod:      npx supabase db push   (CHỈ sau khi test kỹ local + đã có backup)
-- Rollback: viết migration bù trừ HOẶC khôi phục từ backup/PITR (Supabase tiến, không tự lùi).
-- ============================================================================

-- Bảng ví dụ: mỗi người dùng có nhiều "task".
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  is_done    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index cho truy vấn hay dùng: liệt kê task của một người, mới nhất trước.
create index if not exists tasks_user_id_created_at_idx
  on public.tasks (user_id, created_at desc);

-- Tự cập nhật updated_at mỗi lần UPDATE (một nguồn sự thật cho "lần sửa cuối").
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ── Row Level Security: BẬT + policy theo chủ sở hữu ──
-- Mặc định khi bật RLS là TỪ CHỐI tất cả; phải khai policy rõ ràng cho từng thao tác.
-- Người dùng chỉ thấy/sửa/xóa dữ liệu của chính mình (auth.uid() = user_id).
alter table public.tasks enable row level security;

create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);
