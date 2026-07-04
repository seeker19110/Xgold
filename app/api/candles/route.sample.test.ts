import { describe, expect, it, vi } from 'vitest';

/**
 * Chế độ "chưa cấu hình Supabase" (getSupabaseClient → null): route phải phục vụ dữ liệu MẪU lấy từ
 * registry `lib/instruments.ts`, cho MỌI mã hỗ trợ (không chỉ XAU/USD), và trả 404 cho mã lạ.
 */
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => null,
}));

interface CandlesBody {
  symbol: string;
  source: string;
  candles: { close: number }[];
}

describe('GET /api/candles — chế độ dữ liệu mẫu theo registry', () => {
  it('trả nến mẫu cho XAUUSD với source=sample', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=1h'));
    const body = (await res.json()) as CandlesBody;

    expect(res.status).toBe(200);
    expect(body.source).toBe('sample');
    expect(body.candles.length).toBeGreaterThan(0);
  });

  it('trả nến mẫu cho XAGUSD (bạc) — mã thứ hai dùng chung đường ống, dải giá tách biệt', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=XAGUSD&timeframe=1D'));
    const body = (await res.json()) as CandlesBody;

    expect(res.status).toBe(200);
    expect(body.symbol).toBe('XAGUSD');
    expect(body.source).toBe('sample');
    expect(body.candles.length).toBeGreaterThan(0);
    // Bạc ~ vài chục USD/oz, không thể lẫn với dải giá vàng (~3300) — bằng chứng đúng dữ liệu mã.
    expect(body.candles[0]?.close).toBeLessThan(100);
  });

  it('mã lạ (không có trong registry) → 404', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=NOPE&timeframe=1h'));
    expect(res.status).toBe(404);
  });
});
