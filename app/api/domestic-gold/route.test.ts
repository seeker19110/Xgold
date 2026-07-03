import { describe, expect, it, vi, beforeEach } from 'vitest';

/** Cùng phát hiện F-009 với app/api/candles/route.test.ts — xem chú thích ở đó. Route này cũng đọc
 * cột numeric (`buy`/`sell`) từ Supabase và phải coerce về number theo cùng quy ước (Nhóm 12). */

const mockLimit = vi.fn();
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn((table: string) => {
  if (table === 'domestic_gold_prices') return { select: mockSelect };
  throw new Error(`bảng không mong đợi trong test: ${table}`);
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

describe('GET /api/domestic-gold — coercion dữ liệu numeric từ Supabase (F-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả buy/sell dạng NUMBER dù Supabase trả STRING (hình dạng thật của cột numeric qua PostgREST)', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          vendor: 'btmc',
          product: 'Vàng miếng SJC',
          buy: '75500000',
          sell: '76200000',
          ts: '2026-07-03T01:00:00.000Z',
          source: 'btmc',
        },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/domestic-gold/route');
    const res = await GET(new Request('http://localhost/api/domestic-gold'));
    const body = (await res.json()) as { prices: { buy: unknown; sell: unknown }[] };

    expect(res.status).toBe(200);
    expect(typeof body.prices[0]?.buy).toBe('number');
    expect(typeof body.prices[0]?.sell).toBe('number');
    expect(body.prices[0]?.buy).toBeCloseTo(75500000);
  });
});
