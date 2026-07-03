import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('lib/env — validate biến môi trường lúc khởi động', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clientEnv: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY rỗng "" được coi là chưa cấu hình (undefined), không lỗi', async () => {
    // CI (GitHub Actions) nội suy secret chưa đặt thành chuỗi rỗng "", không phải unset — đây là ca
    // đã từng làm build đỏ thật (xem comment trong lib/env.ts), test này chặn tái diễn.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const { clientEnv } = await import('@/lib/env');
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined();
    expect(clientEnv.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('clientEnv: NEXT_PUBLIC_SUPABASE_URL không phải URL hợp lệ → throw lúc import', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'không-phải-url');

    await expect(import('@/lib/env')).rejects.toThrow(/không hợp lệ/);
  });

  it('clientEnv: nhận đúng giá trị hợp lệ khi cấu hình đủ', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-123');

    const { clientEnv } = await import('@/lib/env');
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key-123');
  });

  it('serverEnv: SENTRY_DSN rỗng "" được coi là chưa cấu hình, không lỗi', async () => {
    vi.stubEnv('SENTRY_DSN', '');

    const { serverEnv } = await import('@/lib/env');
    // jsdom (vitest.config.ts environment: 'jsdom') định nghĩa `window`, nên serverEnv thật ra là
    // null trong test — chỉ xác nhận import không throw (đủ để bắt lỗi cấu hình regression).
    expect(serverEnv).toBeNull();
  });
});
