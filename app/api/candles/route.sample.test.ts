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

  it('khung 5m phục vụ từ dải nến 5 phút mẫu (base 5m, không resample)', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=5m'));
    const body = (await res.json()) as CandlesBody & { candles: { ts: string }[] };

    expect(res.status).toBe(200);
    expect(body.candles.length).toBe(288 * 5); // 5 ngày × 288 nến 5m/ngày (SAMPLE_M5_COUNT)
    // Hai nến liên tiếp cách nhau đúng 5 phút.
    const t0 = Date.parse(body.candles[0]!.ts);
    const t1 = Date.parse(body.candles[1]!.ts);
    expect(t1 - t0).toBe(5 * 60 * 1000);
  });

  it('khung 15m/30m resample từ dải 5m mẫu (số nến giảm đúng tỉ lệ 3x/6x)', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res15 = await GET(
      new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=15m'),
    );
    const res30 = await GET(
      new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=30m'),
    );
    const body15 = (await res15.json()) as CandlesBody;
    const body30 = (await res30.json()) as CandlesBody;

    expect(body15.candles.length).toBe((288 * 5) / 3);
    expect(body30.candles.length).toBe((288 * 5) / 6);
  });

  it('khung 1M resample từ dải ngày mẫu — mỗi nến là một tháng dương lịch, mốc ngày 01', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=1M'));
    const body = (await res.json()) as CandlesBody & { candles: { ts: string }[] };

    expect(res.status).toBe(200);
    // Dải ngày mẫu ~3 năm → ~37 nến tháng, đủ dày để chart 1M dùng được.
    expect(body.candles.length).toBeGreaterThanOrEqual(30);
    for (const candle of body.candles) {
      expect(candle.ts.slice(8, 10)).toBe('01'); // ngày 01 đầu tháng UTC
    }
  });

  it('mã lạ (không có trong registry) → 404', async () => {
    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=NOPE&timeframe=1h'));
    expect(res.status).toBe(404);
  });
});
