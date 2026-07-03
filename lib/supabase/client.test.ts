import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  clientEnv: {
    NEXT_PUBLIC_SUPABASE_URL: undefined as string | undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined as string | undefined,
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

describe('getSupabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('trả null khi chưa cấu hình NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (chế độ dữ liệu mẫu)', async () => {
    const { clientEnv } = await import('@/lib/env');
    clientEnv.NEXT_PUBLIC_SUPABASE_URL = undefined;
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined;

    const { getSupabaseClient } = await import('@/lib/supabase/client');
    expect(getSupabaseClient()).toBeNull();
  });

  it('trả cùng 1 instance ở lần gọi thứ hai (cache) khi đã cấu hình đủ biến', async () => {
    const { clientEnv } = await import('@/lib/env');
    clientEnv.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { getSupabaseClient } = await import('@/lib/supabase/client');
    const first = getSupabaseClient();
    const second = getSupabaseClient();
    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('trả null nếu chỉ có URL mà thiếu ANON_KEY', async () => {
    const { clientEnv } = await import('@/lib/env');
    clientEnv.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined;

    const { getSupabaseClient } = await import('@/lib/supabase/client');
    expect(getSupabaseClient()).toBeNull();
  });
});
