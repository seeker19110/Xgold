import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCandles } from '@/components/chart/use-candles';
import type { Candle } from '@/lib/candles/types';

const CANDLE: Candle = {
  ts: '2026-07-03T00:00:00.000Z',
  open: 2350,
  high: 2360,
  low: 2345,
  close: 2355,
  volume: null,
};

describe('useCandles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bắt đầu ở trạng thái loading rồi chuyển success khi fetch thành công', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ candles: [CANDLE], source: 'sample' }), { status: 200 }),
    );

    const { result } = renderHook(() => useCandles('XAUUSD', '1h'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.candles).toEqual([CANDLE]);
    expect(result.current.source).toBe('sample');
    expect(result.current.error).toBeNull();
  });

  it('chuyển sang trạng thái error với message từ response khi HTTP lỗi', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Không tìm thấy symbol 'XAUUSD'" }), { status: 404 }),
    );

    const { result } = renderHook(() => useCandles('XAUUSD', '1h'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe("Không tìm thấy symbol 'XAUUSD'");
    expect(result.current.candles).toEqual([]);
  });

  it('đổi timeframe: hủy kết quả cũ, không áp response chậm của request trước lên state mới', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondCandle: Candle = { ...CANDLE, close: 9999 };

    vi.mocked(fetch)
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ candles: [secondCandle], source: 'sample' }), {
          status: 200,
        }),
      );

    const { result, rerender } = renderHook(
      ({ tf }: { tf: '1h' | '4h' }) => useCandles('XAUUSD', tf),
      {
        initialProps: { tf: '1h' },
      },
    );

    rerender({ tf: '4h' });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.candles).toEqual([secondCandle]);

    // Request đầu (1h) hoàn tất SAU khi request thứ hai (4h) đã set state — không được ghi đè lại.
    resolveFirst(
      new Response(JSON.stringify({ candles: [CANDLE], source: 'sample' }), { status: 200 }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.candles).toEqual([secondCandle]);
  });
});
