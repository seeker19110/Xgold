import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWatchlistRows } from '@/components/watchlist/use-watchlist-rows';
import type { Candle } from '@/lib/candles/types';

function candle(ts: string, close: number): Candle {
  return { ts, open: close, high: close, low: close, close, volume: null };
}

const CANDLES: Candle[] = [
  candle('2026-01-01T00:00:00.000Z', 100),
  candle('2026-01-02T00:00:00.000Z', 110),
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('useWatchlistRows', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('danh sách rỗng → idle, không fetch', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useWatchlistRows([], '1h'));
    expect(result.current.status).toBe('idle');
    expect(result.current.rows).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetch từng mã đã ghim, giữ thứ tự, tính changePercent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }))),
    );

    const { result } = renderHook(() => useWatchlistRows(['XAUUSD', 'DXY'], '1h'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.rows.map((r) => r.symbol)).toEqual(['XAUUSD', 'DXY']);
    expect(result.current.rows[0]?.latestClose).toBe(110);
    expect(result.current.rows[0]?.changePercent).toBeCloseTo(10, 6);
  });

  it('một mã lỗi → dòng đó emptyRow (—), các dòng khác vẫn có dữ liệu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        if (String(input).includes('symbol=DXY')) {
          return Promise.resolve(jsonResponse({ error: 'lỗi DXY' }, 500));
        }
        return Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }));
      }),
    );

    const { result } = renderHook(() => useWatchlistRows(['XAUUSD', 'DXY'], '1h'));
    await waitFor(() => expect(result.current.status).toBe('success'));

    const dxy = result.current.rows.find((r) => r.symbol === 'DXY');
    expect(dxy?.latestClose).toBeNull();
    expect(dxy?.changePercent).toBeNull();
    const xau = result.current.rows.find((r) => r.symbol === 'XAUUSD');
    expect(xau?.latestClose).toBe(110);
  });

  it('TẤT CẢ mã lỗi → status error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ error: 'lỗi toàn bộ' }, 500))),
    );

    const { result } = renderHook(() => useWatchlistRows(['XAUUSD'], '1h'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('lỗi toàn bộ');
    expect(result.current.rows).toEqual([]);
  });

  it('bỏ hết mã → quay lại idle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }))),
    );

    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) => useWatchlistRows(symbols, '1h'),
      { initialProps: { symbols: ['XAUUSD'] } },
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    rerender({ symbols: [] });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.rows).toEqual([]);
  });
});
