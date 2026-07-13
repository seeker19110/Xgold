import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConfluence } from '@/components/chart/use-confluence';
import { DEFAULT_ANALYSIS_CONFIG } from '@/lib/analysis';
import type { Candle } from '@/lib/candles/types';

function candle(ts: string, close: number): Candle {
  return { ts, open: close, high: close, low: close, close, volume: null };
}

const HOURLY: Candle[] = [
  candle('2026-01-01T00:00:00.000Z', 100),
  candle('2026-01-01T01:00:00.000Z', 101),
];
const DAILY: Candle[] = [
  candle('2026-01-01T00:00:00.000Z', 100),
  candle('2026-01-02T00:00:00.000Z', 101),
];

function mockFetchByTimeframe(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.includes('timeframe=1h')) {
        return Promise.resolve(
          new Response(JSON.stringify({ candles: HOURLY, source: 'sample' }), { status: 200 }),
        );
      }
      if (url.includes('timeframe=1D')) {
        return Promise.resolve(
          new Response(JSON.stringify({ candles: DAILY, source: 'sample' }), { status: 200 }),
        );
      }
      throw new Error(`URL không mong đợi trong test: ${url}`);
    }),
  );
}

describe('useConfluence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetch đúng 2 lần (1h + 1D) rồi tính confluence đủ 4 khung (4h/1W suy từ resample)', async () => {
    mockFetchByTimeframe();

    const { result } = renderHook(() => useConfluence('XAUUSD', DEFAULT_ANALYSIS_CONFIG));
    expect(result.current.status).toBe('loading');

    await vi.waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.confluence?.perTimeframe.map((v) => v.timeframe)).toEqual([
      '1h',
      '4h',
      '1D',
      '1W',
    ]);
  });

  it('một request lỗi → status error, message từ response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ error: 'lỗi mạng' }), { status: 500 })),
      ),
    );

    const { result } = renderHook(() => useConfluence('XAUUSD', DEFAULT_ANALYSIS_CONFIG));
    await vi.waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('lỗi mạng');
    expect(result.current.confluence).toBeNull();
  });

  it('đổi symbol → hủy request cũ, không áp response chậm của request trước', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstHourly = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.includes('symbol=XAUUSD')) return firstHourly;
        return Promise.resolve(
          new Response(JSON.stringify({ candles: HOURLY, source: 'sample' }), { status: 200 }),
        );
      }),
    );

    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useConfluence(symbol, DEFAULT_ANALYSIS_CONFIG),
      { initialProps: { symbol: 'XAUUSD' } },
    );

    rerender({ symbol: 'XAGUSD' });
    await vi.waitFor(() => expect(result.current.status).toBe('success'));

    // Request cũ (XAUUSD) hoàn tất SAU khi symbol đã đổi — không được ghi đè state mới.
    resolveFirst(
      new Response(JSON.stringify({ candles: DAILY, source: 'sample' }), { status: 200 }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.status).toBe('success');
  });
});
