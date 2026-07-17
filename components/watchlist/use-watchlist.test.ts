import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWatchlist } from '@/components/watchlist/use-watchlist';
import { WATCHLIST_STORAGE_KEY } from '@/lib/watchlist/types';

describe('useWatchlist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('storage rỗng → khởi tạo rỗng, isHydrated true sau mount', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.watchlist).toEqual([]);
  });

  it('khôi phục danh sách đã lưu ở localStorage sau mount', async () => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(['XAUUSD', 'DXY']));
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.watchlist).toEqual(['XAUUSD', 'DXY']));
    expect(result.current.isHydrated).toBe(true);
  });

  it('pin thêm mã và ghi localStorage', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => result.current.pin('XAGUSD'));

    expect(result.current.watchlist).toEqual(['XAGUSD']);
    expect(result.current.isPinned('XAGUSD')).toBe(true);
    await waitFor(() => {
      expect(localStorage.getItem(WATCHLIST_STORAGE_KEY)).toBe(JSON.stringify(['XAGUSD']));
    });
  });

  it('pin cùng mã hai lần không tạo trùng', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => result.current.pin('XAUUSD'));
    act(() => result.current.pin('XAUUSD'));

    expect(result.current.watchlist).toEqual(['XAUUSD']);
  });

  it('unpin bỏ mã khỏi danh sách', async () => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(['XAUUSD', 'DXY']));
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.watchlist).toEqual(['XAUUSD', 'DXY']));

    act(() => result.current.unpin('XAUUSD'));

    expect(result.current.watchlist).toEqual(['DXY']);
    expect(result.current.isPinned('XAUUSD')).toBe(false);
  });

  it('toggle ghim rồi bỏ ghim', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => result.current.toggle('DXY'));
    expect(result.current.watchlist).toEqual(['DXY']);

    act(() => result.current.toggle('DXY'));
    expect(result.current.watchlist).toEqual([]);
  });

  it('không ghi đè localStorage bằng mảng rỗng trước khi dữ liệu đã lưu kịp áp dụng (F-005)', async () => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(['XAUUSD']));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.watchlist).toEqual(['XAUUSD']));

    const wroteEmpty = setItemSpy.mock.calls.some(
      ([key, value]) => key === WATCHLIST_STORAGE_KEY && value === JSON.stringify([]),
    );
    expect(wroteEmpty).toBe(false);
    setItemSpy.mockRestore();
  });

  it('dữ liệu localStorage hỏng → về rỗng, không throw', async () => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, '{hong');
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.watchlist).toEqual([]);
  });
});
