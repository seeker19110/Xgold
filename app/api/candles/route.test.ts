import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Tái hiện F-009 (COMPLETION-PLAN.md W-101/W-102): PostgREST serialize cột `numeric` của Postgres
 * thành STRING trong JSON response (tránh mất độ chính xác thập phân) — hành vi đã biết của
 * PostgREST/supabase-js, không phải giả định. `database.types.ts` khai `open/high/low/close: number`
 * nhưng route đọc thẳng dữ liệu Supabase vào `Candle[]` KHÔNG qua Zod validate/coerce — nếu Supabase
 * thật trả string, toán học ở `sma()`/`ema()`/`rsi()` (`sum += candle.close`) sẽ làm string concat
 * thay vì cộng số, ra `NaN` khi chia. Test này giả lập ĐÚNG hình dạng response đó (string) để xác nhận
 * route có coerce đúng về number hay không — không cần Supabase thật (mạng sandbox chặn).
 */

const mockLimit = vi.fn();
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockEqTimeframe = vi.fn(() => ({ order: mockOrder }));
const mockEqInstrumentId = vi.fn(() => ({ eq: mockEqTimeframe }));
const mockSingle = vi.fn();
const mockEqSymbol = vi.fn(() => ({ single: mockSingle }));
const mockSelectInstrument = vi.fn(() => ({ eq: mockEqSymbol }));
const mockSelectCandles = vi.fn(() => ({ eq: mockEqInstrumentId }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'instruments') return { select: mockSelectInstrument };
  if (table === 'candles') return { select: mockSelectCandles };
  throw new Error(`bảng không mong đợi trong test: ${table}`);
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

describe('GET /api/candles — coercion dữ liệu numeric từ Supabase (F-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: 'instrument-1' }, error: null });
  });

  it('trả open/high/low/close dạng NUMBER dù Supabase trả STRING (hình dạng thật của cột numeric qua PostgREST)', async () => {
    // Đúng hình dạng PostgREST thật trả về cho cột `numeric`: chuỗi, không phải number.
    mockLimit.mockResolvedValue({
      data: [
        {
          ts: '2026-07-03T00:00:00.000Z',
          open: '2350.50',
          high: '2360.25',
          low: '2345.00',
          close: '2355.75',
          volume: null,
        },
        {
          ts: '2026-07-03T01:00:00.000Z',
          open: '2355.75',
          high: '2365.00',
          low: '2350.00',
          close: '2358.10',
          volume: null,
        },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=1h'));
    const body = (await res.json()) as {
      candles: { open: unknown; high: unknown; low: unknown; close: unknown }[];
    };

    expect(res.status).toBe(200);
    for (const candle of body.candles) {
      expect(typeof candle.open).toBe('number');
      expect(typeof candle.high).toBe('number');
      expect(typeof candle.low).toBe('number');
      expect(typeof candle.close).toBe('number');
    }
    expect(body.candles[0]?.close).toBeCloseTo(2355.75);

    // Bằng chứng cụ thể cho rủi ro F-009 mô tả: nếu route KHÔNG coerce, giá trị vẫn là string và
    // sum += "2350.50" (string concat) rồi chia cho period sẽ ra NaN — đây là phép tính thật dùng
    // trong lib/indicators/sma.ts, chạy trực tiếp trên dữ liệu route trả về để chứng minh hết đường ống.
    let sum = 0;
    for (const candle of body.candles) sum += candle.close as number;
    expect(Number.isNaN(sum / body.candles.length)).toBe(false);
  });
});
