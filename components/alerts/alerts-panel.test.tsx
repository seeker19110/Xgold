import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertsPanel } from '@/components/alerts/alerts-panel';
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

/** Cài Notification giả (đã cấp quyền) + đếm số lần khởi tạo — để kiểm "bắn đúng 1 lần". */
function stubGrantedNotification(): { calls: () => number } {
  const ctor = vi.fn();
  class FakeNotification {
    static permission: NotificationPermission = 'granted';
    static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    constructor(title: string, options?: NotificationOptions) {
      ctor(title, options);
    }
  }
  vi.stubGlobal('Notification', FakeNotification);
  return { calls: () => ctor.mock.calls.length };
}

describe('AlertsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('đặt cảnh báo qua form → hiện trong danh sách', async () => {
    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={null} />);

    fireEvent.change(screen.getByLabelText('Mức giá'), { target: { value: '2600' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cảnh báo' }));

    await waitFor(() => {
      expect(screen.getByText(/vượt lên trên/)).toBeInTheDocument();
    });
    expect(screen.getByText('Đang chờ')).toBeInTheDocument();
    expect(screen.getByText('$2,600')).toBeInTheDocument();
  });

  it('mức giá trống → báo lỗi (Zod), không thêm alert', () => {
    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={null} />);

    // Bỏ trống mức giá rồi gửi — native min không chặn ô trống, để lộ nhánh validate Zod (0 không
    // dương). Giá âm bị chính native constraint `min="0"` chặn trước ở trình duyệt thật.
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cảnh báo' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/số dương/);
    expect(screen.getByText('Chưa có cảnh báo nào.')).toBeInTheDocument();
  });

  it('xóa cảnh báo → biến mất khỏi danh sách + localStorage', async () => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([storedAlert()]));
    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={null} />);

    const removeButton = await screen.findByRole('button', { name: /Xóa cảnh báo/ });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText('Chưa có cảnh báo nào.')).toBeInTheDocument();
    });
    expect(localStorage.getItem(ALERTS_STORAGE_KEY)).toBe(JSON.stringify([]));
  });

  it("above: giá vượt ngưỡng → Notification bắn đúng 1 lần + alert 'Đã kích hoạt'", async () => {
    const notif = stubGrantedNotification();
    localStorage.setItem(
      ALERTS_STORAGE_KEY,
      JSON.stringify([storedAlert({ direction: 'above', targetPrice: 2500 })]),
    );

    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={2600} />);

    await waitFor(() => expect(screen.getByText('Đã kích hoạt')).toBeInTheDocument());
    expect(notif.calls()).toBe(1);
  });

  it('below: giá xuống dưới ngưỡng → Notification bắn', async () => {
    const notif = stubGrantedNotification();
    localStorage.setItem(
      ALERTS_STORAGE_KEY,
      JSON.stringify([storedAlert({ direction: 'below', targetPrice: 2500 })]),
    );

    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={2400} />);

    await waitFor(() => expect(notif.calls()).toBe(1));
  });

  it('giá chưa chạm ngưỡng → không bắn, alert vẫn đang chờ', async () => {
    const notif = stubGrantedNotification();
    localStorage.setItem(
      ALERTS_STORAGE_KEY,
      JSON.stringify([storedAlert({ direction: 'above', targetPrice: 2500 })]),
    );

    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={2400} />);

    await waitFor(() => expect(screen.getByText('Đang chờ')).toBeInTheDocument());
    expect(notif.calls()).toBe(0);
  });

  it('alert của mã khác không kích hoạt khi đang xem mã hiện tại', async () => {
    const notif = stubGrantedNotification();
    localStorage.setItem(
      ALERTS_STORAGE_KEY,
      JSON.stringify([storedAlert({ symbol: 'DXY', direction: 'above', targetPrice: 100 })]),
    );

    // Đang xem XAUUSD, latestClose của XAUUSD vượt 100 nhưng alert là của DXY → không bắn.
    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={2600} />);

    await waitFor(() => expect(screen.getByText('Đang chờ')).toBeInTheDocument());
    expect(notif.calls()).toBe(0);
  });

  it('không hỗ trợ Notification → hiện ghi chú, không throw', () => {
    // jsdom mặc định không có Notification.
    render(<AlertsPanel symbol="XAUUSD" label="XAU/USD" latestClose={null} />);
    expect(screen.getByText(/không hỗ trợ thông báo/)).toBeInTheDocument();
  });
});
