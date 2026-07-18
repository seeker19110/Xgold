'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deserializeWatchlist,
  serializeWatchlist,
  WATCHLIST_STORAGE_KEY,
  type Watchlist,
} from '@/lib/watchlist/types';

export interface UseWatchlist {
  /** Danh sách symbol đã ghim (thứ tự = thứ tự ghim). Rỗng cho tới khi hydrate xong. */
  watchlist: Watchlist;
  isPinned: (symbol: string) => boolean;
  pin: (symbol: string) => void;
  unpin: (symbol: string) => void;
  toggle: (symbol: string) => void;
  /** `false` cho tới khi effect đọc localStorage sau mount xong — chặn ghi đè trạng thái đã lưu. */
  isHydrated: boolean;
}

/**
 * Đọc/ghi watchlist trong `localStorage` (SSR-safe theo đúng mẫu `use-indicator-config.ts`): khởi
 * tạo mảng RỖNG để khớp render server (localStorage chỉ có ở client), đọc giá trị thật SAU mount rồi
 * mới bật cờ `isHydrated`. Cờ này chặn effect ghi chạy trước khi effect đọc kịp áp dụng — thiếu nó,
 * lần mount đầu ghi đè `[]` lên dữ liệu đã lưu (F-005). Dữ liệu hỏng → về rỗng, không throw.
 */
export function useWatchlist(): UseWatchlist {
  const [watchlist, setWatchlist] = useState<Watchlist>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchlist(deserializeWatchlist(window.localStorage.getItem(WATCHLIST_STORAGE_KEY)));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, serializeWatchlist(watchlist));
  }, [watchlist, isHydrated]);

  const pin = useCallback((symbol: string) => {
    setWatchlist((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
  }, []);

  const unpin = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((s) => s !== symbol));
  }, []);

  const toggle = useCallback((symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  }, []);

  const isPinned = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  return { watchlist, isPinned, pin, unpin, toggle, isHydrated };
}
