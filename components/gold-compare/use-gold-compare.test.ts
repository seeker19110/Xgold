import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGoldCompare } from '@/components/gold-compare/use-gold-compare';
import type { Candle } from '@/lib/candles/types';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

const DOMESTIC_PRICE: DomesticGoldPrice = {
  vendor: 'btmc',
  product: 'SJC 1L, 10L, 1KG',
  buy: 97_000_000,
  sell: 99_000_000,
  ts: '2026-07-05T01:00:00.000Z',
  source: 'btmc',
};

const XAU_CANDLE: Candle = {
  ts: '2026-07-05T00:00:00.000Z',
  open: 3190,
  high: 3210,
  low: 3180,
  close: 3200,
  volume: null,
};

const USDVND_CANDLE: Candle = {
  ts: '2026-07-04T23:00:00.000Z',
  open: 26200,
  high: 26350,
  low: 26150,
  close: 26300,
  volume: null,
};

function mockFetchByUrl(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.startsWith('/api/domestic-gold')) {
        return Promise.resolve(
          new Response(JSON.stringify({ prices: [DOMESTIC_PRICE], source: 'sample' }), {
            status: 200,
          }),
        );
      }
      if (url.includes('symbol=XAUUSD')) {
        return Promise.resolve(
          new Response(JSON.stringify({ candles: [XAU_CANDLE], source: 'sample' }), {
            status: 200,
          }),
        );
      }
      if (url.includes('symbol=USDVND')) {
        return Promise.resolve(
          new Response(JSON.stringify({ candles: [USDVND_CANDLE], source: 'sample' }), {
            status: 200,
          }),
        );
      }
      throw new Error(`URL không mong đợi trong test: ${url}`);
    }),
  );
}

describe('useGoldCompare', () => {
  beforeEach(() => {
    // Không dùng fake timers — hook này không poll (khác useDomesticGold), chỉ tải 1 lần khi mount.
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gộp giá trong nước + XAU/USD + USD/VND → tính đúng dòng so sánh', async () => {
    mockFetchByUrl();

    const { result } = renderHook(() => useGoldCompare());
    await vi.waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.rows).toHaveLength(1);
    const row = result.current.rows[0]!;
    expect(row.vendor).toBe('btmc');
    // world/lượng = 3200 × (37.5/31.1034768) × 26300 ≈ 101 467 756.17 (tính độc lập bằng máy tính)
    expect(row.worldPerLuongVnd).toBeCloseTo(101467756.17058991, 3);
    expect(row.domesticSellVnd).toBe(99_000_000);
    // Mốc thời gian phải lấy nến CŨ HƠN trong 2 nến (USD/VND, 23:00 < XAU 00:00 hôm sau)
    expect(result.current.worldAsOfTs).toBe(USDVND_CANDLE.ts);
  });

  it('thiếu nến (mảng rỗng) → rows rỗng, KHÔNG đoán giá trị', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.startsWith('/api/domestic-gold')) {
          return Promise.resolve(
            new Response(JSON.stringify({ prices: [DOMESTIC_PRICE], source: 'sample' }), {
              status: 200,
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ candles: [], source: 'sample' }), { status: 200 }),
        );
      }),
    );

    const { result } = renderHook(() => useGoldCompare());
    await vi.waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.rows).toEqual([]);
    expect(result.current.worldAsOfTs).toBeNull();
  });

  it('1 trong 3 request lỗi → status error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.startsWith('/api/domestic-gold')) {
          return Promise.resolve(new Response(JSON.stringify({ error: 'lỗi' }), { status: 500 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ candles: [XAU_CANDLE], source: 'sample' }), {
            status: 200,
          }),
        );
      }),
    );

    const { result } = renderHook(() => useGoldCompare());
    await vi.waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.rows).toEqual([]);
  });
});
