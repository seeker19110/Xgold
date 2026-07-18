import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlerts } from '@/components/alerts/use-alerts';
import { ALERTS_STORAGE_KEY, type PriceAlert } from '@/lib/alerts/types';

function storedAlert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: 'a1',
    symbol: 'XAUUSD',
    direction: 'above',
    targetPrice: 2500,
    createdAt: '2026-07-18T00:00:00.000Z',
    triggeredAt: null,
    ...overrides,
  };
}

describe('useAlerts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('storage rỗng → khởi tạo rỗng, isHydrated true sau mount', async () => {
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.alerts).toEqual([]);
  });

  it('khôi phục alert đã lưu ở localStorage sau mount', async () => {
    const alert = storedAlert();
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([alert]));
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.alerts).toEqual([alert]));
    expect(result.current.isHydrated).toBe(true);
  });

  it('addAlert thêm alert active + ghi localStorage', async () => {
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => result.current.addAlert({ symbol: 'DXY', direction: 'below', targetPrice: 100 }));

    expect(result.current.alerts).toHaveLength(1);
    const added = result.current.alerts[0]!;
    expect(added).toMatchObject({ symbol: 'DXY', direction: 'below', targetPrice: 100 });
    expect(added.triggeredAt).toBeNull();
    expect(added.id).toBeTruthy();

    await waitFor(() => {
      const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string)).toHaveLength(1);
    });
  });

  it('removeAlert xóa khỏi danh sách + localStorage', async () => {
    const alert = storedAlert();
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([alert]));
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.alerts).toEqual([alert]));

    act(() => result.current.removeAlert('a1'));

    expect(result.current.alerts).toEqual([]);
    await waitFor(() => {
      expect(localStorage.getItem(ALERTS_STORAGE_KEY)).toBe(JSON.stringify([]));
    });
  });

  it('markTriggered ghi triggeredAt một lần, gọi lại không đổi thời điểm (idempotent)', async () => {
    const alert = storedAlert();
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([alert]));
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.alerts).toEqual([alert]));

    act(() => result.current.markTriggered('a1'));
    const firstTriggeredAt = result.current.alerts[0]!.triggeredAt;
    expect(firstTriggeredAt).not.toBeNull();

    act(() => result.current.markTriggered('a1'));
    expect(result.current.alerts[0]!.triggeredAt).toBe(firstTriggeredAt);
  });

  it('không ghi đè localStorage bằng mảng rỗng trước khi dữ liệu đã lưu kịp áp dụng (F-005)', async () => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([storedAlert()]));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    const wroteEmpty = setItemSpy.mock.calls.some(
      ([key, value]) => key === ALERTS_STORAGE_KEY && value === JSON.stringify([]),
    );
    expect(wroteEmpty).toBe(false);
    setItemSpy.mockRestore();
  });

  it('dữ liệu localStorage hỏng → về rỗng, không throw', async () => {
    localStorage.setItem(ALERTS_STORAGE_KEY, '{hong');
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.alerts).toEqual([]);
  });

  it('không có Notification API → notificationPermission = unsupported, requestPermission không throw', async () => {
    const { result } = renderHook(() => useAlerts());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.notificationPermission).toBe('unsupported');
    expect(() => act(() => result.current.requestPermission())).not.toThrow();
  });
});
