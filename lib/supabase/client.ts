import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { clientEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

let cached: SupabaseClient<Database> | null | undefined;

/**
 * Client Supabase CHỈ ĐỌC (anon key) — dùng ở server (Route Handler) để đọc `candles`/`instruments`
 * (RLS đã cho phép SELECT công khai, xem migration). Trả `null` nếu chưa cấu hình biến môi trường —
 * nơi gọi tự quyết định fallback (MVP dùng dữ liệu mẫu, xem `app/api/candles/route.ts`).
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cached !== undefined) return cached;

  if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    cached = null;
    return cached;
  }

  cached = createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}
