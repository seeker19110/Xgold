import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompareCandles } from '@/components/chart/use-compare-candles';
import type { Candle } from '@/lib/candles/types';

const CANDLE: Candle = {
  ts: '2026-07-03T00:00:00.000Z',
  open: 2350,
  high: 2360,
  low: 2345,
  close: 2355,
  volume: null,
};

describe('useCompareCandles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('symbol null: ở trạng thái idle và KHÔNG gọi fetch', () => {
    const { result } = renderHook(() => useCompareCandles(null, '1h'));

    expect(result.current.status).toBe('idle');
    expect(result.current.candles).toEqual([]);
    expect(result.current.source).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('chọn mã: loading rồi success khi fetch thành công', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ candles: [CANDLE], source: 'sample' }), { status: 200 }),
    );

    const { result } = renderHook(() => useCompareCandles('XAGUSD', '1h'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.candles).toEqual([CANDLE]);
    expect(result.current.source).toBe('sample');
  });

  it('HTTP lỗi: chuyển sang error với message từ response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Không tìm thấy symbol 'XAGUSD'" }), { status: 404 }),
    );

    const { result } = renderHook(() => useCompareCandles('XAGUSD', '1h'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe("Không tìm thấy symbol 'XAGUSD'");
    expect(result.current.candles).toEqual([]);
  });

  it('bỏ chọn mã (symbol → null): quay lại idle và không fetch thêm', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ candles: [CANDLE], source: 'sample' }), { status: 200 }),
    );

    const { result, rerender } = renderHook(
      ({ sym }: { sym: string | null }) => useCompareCandles(sym, '1h'),
      { initialProps: { sym: 'XAGUSD' as string | null } },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    vi.mocked(fetch).mockClear();

    rerender({ sym: null });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.candles).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('đổi mã: hủy kết quả cũ, không áp response chậm của request trước lên state mới', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondCandle: Candle = { ...CANDLE, close: 31 };

    vi.mocked(fetch)
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ candles: [secondCandle], source: 'sample' }), {
          status: 200,
        }),
      );

    const { result, rerender } = renderHook(
      ({ sym }: { sym: string }) => useCompareCandles(sym, '1h'),
      { initialProps: { sym: 'XAGUSD' } },
    );

    rerender({ sym: 'DXY' });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.candles).toEqual([secondCandle]);

    resolveFirst(
      new Response(JSON.stringify({ candles: [CANDLE], source: 'sample' }), { status: 200 }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.candles).toEqual([secondCandle]);
  });
});
