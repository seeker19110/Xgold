import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDomesticGold } from '@/components/domestic-gold/use-domestic-gold';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

const PRICE: DomesticGoldPrice = {
  vendor: 'btmc',
  product: 'Vàng miếng SJC',
  buy: 75_500_000,
  sell: 76_200_000,
  ts: '2026-07-03T01:00:00.000Z',
  source: 'btmc',
};

describe('useDomesticGold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('tải thành công lần đầu → status success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ prices: [PRICE], source: 'sample' }), { status: 200 }),
    );

    const { result } = renderHook(() => useDomesticGold());
    await vi.waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.prices).toEqual([PRICE]);
  });

  it('tải lần đầu lỗi → status error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'lỗi' }), { status: 500 }),
    );

    const { result } = renderHook(() => useDomesticGold());
    await vi.waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.prices).toEqual([]);
  });

  it('poll thất bại SAU khi đã tải thành công KHÔNG xóa dữ liệu đang hiển thị (chỉ trạng thái error toàn màn hình khi lần ĐẦU thất bại)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ prices: [PRICE], source: 'sample' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'mất mạng' }), { status: 500 }));

    const { result } = renderHook(() => useDomesticGold());
    await vi.waitFor(() => expect(result.current.status).toBe('success'));

    await vi.advanceTimersByTimeAsync(60_000);

    expect(result.current.status).toBe('success');
    expect(result.current.prices).toEqual([PRICE]);
  });

  it('truyền vendor → gọi API với query param vendor', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ prices: [], source: 'sample' }), { status: 200 }),
    );

    renderHook(() => useDomesticGold('btmc'));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/domestic-gold?vendor=btmc');
  });
});
