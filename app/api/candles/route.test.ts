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
    // Thứ tự MỚI→CŨ vì route truy vấn `order('ts', { ascending: false })` (xem test hồi quy dưới).
    mockLimit.mockResolvedValue({
      data: [
        {
          ts: '2026-07-03T01:00:00.000Z',
          open: '2355.75',
          high: '2365.00',
          low: '2350.00',
          close: '2358.10',
          volume: null,
        },
        {
          ts: '2026-07-03T00:00:00.000Z',
          open: '2350.50',
          high: '2360.25',
          low: '2345.00',
          close: '2355.75',
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

/**
 * Hồi quy cho lỗi `order(ascending: true) + limit(2000)`: truy vấn cũ lấy 2000 nến CŨ NHẤT thay vì
 * mới nhất. Bảng `candles` thật vượt trần này sau ~83 ngày ở khung cơ sở `1h` (~7 ngày ở `5m`) —
 * từ đó chart đóng băng ở dữ liệu cũ, KHÔNG ném lỗi nào nên không có gì bắt được. Fixture local
 * nhỏ hơn trần nên không bao giờ lộ; chỉ mock ở mức truy vấn mới tái hiện được.
 */
describe('GET /api/candles — luôn lấy nến MỚI NHẤT khi bảng vượt trần limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: 'instrument-1' }, error: null });
  });

  it('truy vấn Supabase sắp GIẢM DẦN theo ts (nếu tăng dần sẽ cắt mất phần mới nhất)', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { GET } = await import('@/app/api/candles/route');
    await GET(new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=1h'));

    expect(mockOrder).toHaveBeenCalledWith('ts', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(2000);
  });

  it('trả nến theo thứ tự CŨ→MỚI cho client, dù truy vấn trả mới→cũ', async () => {
    // Hình dạng thật của response khi `ascending: false`: nến mới nhất đứng đầu.
    mockLimit.mockResolvedValue({
      data: [
        { ts: '2026-07-03T02:00:00.000Z', open: 3, high: 3, low: 3, close: 3, volume: null },
        { ts: '2026-07-03T01:00:00.000Z', open: 2, high: 2, low: 2, close: 2, volume: null },
        { ts: '2026-07-03T00:00:00.000Z', open: 1, high: 1, low: 1, close: 1, volume: null },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/candles/route');
    const res = await GET(new Request('http://localhost/api/candles?symbol=XAUUSD&timeframe=1h'));
    const body = (await res.json()) as { candles: { ts: string; close: number }[] };

    expect(res.status).toBe(200);
    expect(body.candles.map((c) => c.close)).toEqual([1, 2, 3]);
    // Bất biến mà `resample()` và lightweight-charts đều dựa vào: ts tăng nghiêm ngặt.
    const timestamps = body.candles.map((c) => new Date(c.ts).getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });
});
