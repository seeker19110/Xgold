// lib/env.ts
import { z } from 'zod';

// CI (GitHub Actions) đặt biến qua `${{ secrets.X }}` trong env: — khi secret CHƯA cấu hình, giá trị
// nội suy ra là CHUỖI RỖNG "", không phải unset (khác với môi trường thiếu hẳn biến hoàn toàn) — xác
// nhận bằng log CI thật (job e2e/lighthouse đỏ vì "" không qua được z.string().url()). `.optional()`
// chỉ chấp nhận undefined, không chấp nhận "" — tiền xử lý rỗng→undefined trước khi validate.
const emptyToUndefined = (val: unknown) => (val === '' ? undefined : val);

/**
 * Xác thực biến môi trường NGAY khi khởi động.
 * Thiếu hoặc sai biến nào → app dừng lại với thông báo rõ ràng,
 * thay vì để lỗi mơ hồ xảy ra lúc chạy (một trong những nguồn bug hay gặp nhất).
 *
 * LƯU Ý QUAN TRỌNG với Next.js:
 * - Biến BÍ MẬT (chỉ server) KHÔNG được có tiền tố NEXT_PUBLIC_.
 * - Biến cho CLIENT BẮT BUỘC có tiền tố NEXT_PUBLIC_, và phải được tham chiếu
 *   TƯỜNG MINH (process.env.NEXT_PUBLIC_X) thì Next mới "nhúng" được giá trị vào bundle.
 *
 * → Đổi tên các biến dưới đây cho khớp dự án của bạn.
 */

// ──────────────────────────────────────────────
// Biến CÔNG KHAI (an toàn để lộ ra client)
// ──────────────────────────────────────────────
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY để OPTIONAL (khác mặc định của khung): MVP Xgold cho phép chạy
// chưa cấu hình Supabase — /api/candles tự chuyển sang dữ liệu mẫu (lib/fixtures/xauusd.ts), gắn
// nhãn rõ ràng trên UI (xem docs/plans/xgold-mvp-plan.md). Nơi thực sự cần kết nối Supabase phải tự
// kiểm tra `clientEnv.NEXT_PUBLIC_SUPABASE_URL` trước khi dùng (xem lib/supabase/client.ts).
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url('NEXT_PUBLIC_SUPABASE_URL phải là URL hợp lệ').optional(),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1, 'Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY').optional(),
  ),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

const clientParsed = clientSchema.safeParse({
  // Phải liệt kê tường minh để Next.js inline được:
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!clientParsed.success) {
  console.error('❌ Biến môi trường CLIENT không hợp lệ:');
  console.error(clientParsed.error.flatten().fieldErrors);
  throw new Error('Cấu hình môi trường client không hợp lệ — xem log ở trên.');
}

export const clientEnv = clientParsed.data;

// ──────────────────────────────────────────────
// Biến BÍ MẬT (chỉ dùng ở server — KHÔNG bao giờ import vào code chạy ở client)
// ──────────────────────────────────────────────
// SUPABASE_SERVICE_ROLE_KEY để OPTIONAL cùng lý do với NEXT_PUBLIC_SUPABASE_* ở trên — app Next.js
// hiện KHÔNG dùng service role key ở đâu (chỉ đọc qua anon key, xem lib/supabase/client.ts); khóa
// này chỉ cần cho scripts/backfill.ts và Edge Function (đọc process.env trực tiếp, không qua đây).
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1, 'Thiếu SUPABASE_SERVICE_ROLE_KEY').optional(),
  ),
  // Tùy chọn — thêm các bí mật khác của dự án ở đây (vd khóa API bên thứ ba).
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadServerEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Biến môi trường SERVER không hợp lệ:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Cấu hình môi trường server không hợp lệ — xem log ở trên.');
  }
  return parsed.data;
}

/**
 * Chỉ nạp biến server khi đang chạy ở phía server.
 * Ở client, giá trị này là null — đừng dùng tới nó trong code client.
 */
export const serverEnv = typeof window === 'undefined' ? loadServerEnv() : (null as never);
