'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ALERTS_STORAGE_KEY,
  deserializeAlerts,
  serializeAlerts,
  type AlertDirection,
  type PriceAlert,
  type PriceAlerts,
} from '@/lib/alerts/types';

/** Quyền thông báo: các giá trị của Notification API + `'unsupported'` khi trình duyệt không có API. */
export type NotificationPermissionState = NotificationPermission | 'unsupported';

export interface CreateAlertInput {
  symbol: string;
  direction: AlertDirection;
  targetPrice: number;
}

export interface UseAlerts {
  /** Toàn bộ alert (mọi symbol). Rỗng cho tới khi hydrate xong. */
  alerts: PriceAlerts;
  /** `false` cho tới khi effect đọc localStorage sau mount xong — chặn ghi đè trạng thái đã lưu. */
  isHydrated: boolean;
  /** Quyền thông báo hiện tại (đồng bộ với `Notification.permission`). */
  notificationPermission: NotificationPermissionState;
  addAlert: (input: CreateAlertInput) => void;
  removeAlert: (id: string) => void;
  /** Đánh dấu đã kích hoạt (ghi thời điểm UTC) — idempotent, gọi lại trên alert đã bắn không đổi gì. */
  markTriggered: (id: string) => void;
  /** Xin quyền thông báo (không throw nếu bị từ chối / không hỗ trợ). */
  requestPermission: () => void;
}

function readPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** ID ổn định cho alert. `crypto.randomUUID` có ở Node 22 + trình duyệt hiện đại; fallback phòng thủ. */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Đọc/ghi danh sách cảnh báo giá trong `localStorage` (SSR-safe theo đúng mẫu `use-watchlist.ts`):
 * khởi tạo mảng RỖNG để khớp render server (localStorage chỉ có ở client), đọc giá trị thật SAU
 * mount rồi mới bật cờ `isHydrated`. Cờ này chặn effect ghi chạy trước khi effect đọc kịp áp dụng —
 * thiếu nó, lần mount đầu ghi đè `[]` lên dữ liệu đã lưu (F-005). Dữ liệu hỏng → về rỗng, không throw.
 *
 * Quyền thông báo: giữ trong state để UI phản ứng ngay sau khi người dùng cho/từ chối quyền.
 */
export function useAlerts(): UseAlerts {
  const [alerts, setAlerts] = useState<PriceAlerts>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>('unsupported');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts(deserializeAlerts(window.localStorage.getItem(ALERTS_STORAGE_KEY)));
    setNotificationPermission(readPermission());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(ALERTS_STORAGE_KEY, serializeAlerts(alerts));
  }, [alerts, isHydrated]);

  const requestPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    // API cũ dùng callback, API mới trả Promise — bọc phòng thủ để không throw dù dạng nào.
    try {
      const result = Notification.requestPermission((perm) => setNotificationPermission(perm));
      if (result && typeof result.then === 'function') {
        void result.then((perm) => setNotificationPermission(perm)).catch(() => undefined);
      }
    } catch {
      // Một số trình duyệt ném khi gọi ngoài cử chỉ người dùng — nuốt lỗi, không chặn UI.
    }
  }, []);

  const addAlert = useCallback(
    ({ symbol, direction, targetPrice }: CreateAlertInput) => {
      const alert: PriceAlert = {
        id: newId(),
        symbol,
        direction,
        targetPrice,
        createdAt: new Date().toISOString(),
        triggeredAt: null,
      };
      setAlerts((prev) => [...prev, alert]);
      // Xin quyền khi người dùng đặt alert (cử chỉ người dùng) nếu chưa quyết định — tôn trọng lựa
      // chọn đã từ chối trước đó (không hỏi lại), và bỏ qua khi không hỗ trợ.
      if (readPermission() === 'default') requestPermission();
    },
    [requestPermission],
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const markTriggered = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id && alert.triggeredAt === null
          ? { ...alert, triggeredAt: new Date().toISOString() }
          : alert,
      ),
    );
  }, []);

  return {
    alerts,
    isHydrated,
    notificationPermission,
    addAlert,
    removeAlert,
    markTriggered,
    requestPermission,
  };
}
