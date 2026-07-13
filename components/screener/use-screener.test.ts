import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScreener } from '@/components/screener/use-screener';
import type { Candle } from '@/lib/candles/types';

function candle(ts: string, close: number): Candle {
  return { ts, open: close, high: close, low: close, close, volume: null };
}

// Chuỗi tăng đều đủ dài để rsi/sma(200) có giá trị null (không cần khớp gợi ý cụ thể — test này chỉ
// kiểm hành vi tổng hợp/fetch của hook, không kiểm giá trị engine — đã có unit test riêng ở
// lib/analysis).
const CANDLES: Candle[] = Array.from({ length: 5 }, (_, i) =>
  candle(`2026-01-0${i + 1}T00:00:00.000Z`, 100 + i),
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('useScreener', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('khung 1D: tái dùng candles đã fetch cho marketContext (không fetch thêm) — 4 request tổng', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }))),
    );

    const { result } = renderHook(() => useScreener('1D'));
    expect(result.current.status).toBe('loading');

    await vi.waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.rows).toHaveLength(4); // XAUUSD, XAGUSD, DXY, USDVND
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(result.current.marketContext?.xau1D).toEqual(CANDLES);
    expect(result.current.marketContext?.xag1D).toEqual(CANDLES);
    expect(result.current.marketContext?.dxy1D).toEqual(CANDLES);
  });

  it('khung khác 1D: fetch thêm 1D riêng cho XAU/XAG/DXY (không fetch trùng cho USDVND)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }))),
    );

    const { result } = renderHook(() => useScreener('1h'));
    await vi.waitFor(() => expect(result.current.status).toBe('success'));

    // 4 request khung 1h (mọi mã) + 3 request 1D riêng (XAU/XAG/DXY, KHÔNG có USDVND) = 7.
    expect(fetch).toHaveBeenCalledTimes(7);
    expect(result.current.marketContext?.xau1D).toEqual(CANDLES);
    expect(result.current.marketContext?.dxy1D).toEqual(CANDLES);
  });

  it('một mã lỗi → dòng đó "—" (emptyRow), các dòng khác vẫn có dữ liệu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.includes('symbol=XAGUSD')) {
          return Promise.resolve(jsonResponse({ error: 'lỗi mã bạc' }, 500));
        }
        return Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }));
      }),
    );

    const { result } = renderHook(() => useScreener('1D'));
    await vi.waitFor(() => expect(result.current.status).toBe('success'));

    const xagRow = result.current.rows.find((r) => r.symbol === 'XAGUSD');
    expect(xagRow?.latestClose).toBeNull();
    expect(xagRow?.direction).toBeNull();
    expect(xagRow?.source).toBeNull();

    const xauRow = result.current.rows.find((r) => r.symbol === 'XAUUSD');
    expect(xauRow?.latestClose).toBe(CANDLES.at(-1)?.close);
    expect(xauRow?.source).toBe('sample');
  });

  it('TẤT CẢ mã lỗi → status error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ error: 'lỗi toàn bộ' }, 500))),
    );

    const { result } = renderHook(() => useScreener('1D'));
    await vi.waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('lỗi toàn bộ');
    expect(result.current.rows).toEqual([]);
  });

  it('đổi khung → hủy request cũ, không áp response chậm của request trước lên state mới', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    // Chỉ chặn ĐÚNG lần gọi đầu tiên (mount ban đầu, tf='1D', mã XAUUSD) — các lần gọi sau (kể cả
    // fetch bối cảnh thị trường của rerender tf='1h') phải trả về ngay, nếu không test sẽ treo.
    let firstXauCallUsed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (!firstXauCallUsed && url.includes('timeframe=1D') && url.includes('symbol=XAUUSD')) {
          firstXauCallUsed = true;
          return firstResponse;
        }
        return Promise.resolve(jsonResponse({ candles: CANDLES, source: 'sample' }));
      }),
    );

    const { result, rerender } = renderHook(({ tf }: { tf: '1D' | '1h' }) => useScreener(tf), {
      initialProps: { tf: '1D' },
    });

    rerender({ tf: '1h' });
    await vi.waitFor(() => expect(result.current.status).toBe('success'));

    resolveFirst(jsonResponse({ candles: CANDLES, source: 'sample' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.status).toBe('success');
  });
});
