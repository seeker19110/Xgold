'use client';

import { useEffect, useId, useState } from 'react';
import type { Timeframe } from '@/lib/candles/types';
import { WatchlistPanel } from '@/components/watchlist/watchlist-panel';
import { useWatchlistRows } from '@/components/watchlist/use-watchlist-rows';

interface WatchlistProps {
  /** Symbol đã ghim (từ `useWatchlist` ở trang cha — nguồn state chia sẻ với nút ghim ở header). */
  symbols: readonly string[];
  /** Khung thời gian đang xem — watchlist tính giá/tín hiệu cùng khung cho nhất quán với chart. */
  timeframe: Timeframe;
  onUnpin: (symbol: string) => void;
}

function WatchlistHeading({ count }: { count: number }) {
  return (
    <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
      Theo dõi
      {count > 0 && (
        <span className="bg-surface border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs tabular-nums">
          {count}
        </span>
      )}
    </h2>
  );
}

/**
 * Danh sách theo dõi (W-509). Bố cục đáp ứng:
 * - Desktop (≥ `md`): cột phải cố định `w-72`, `sticky top-6` — nằm cạnh chart trong flex container
 *   của trang, KHÔNG đè chart.
 * - Mobile (< `md`): nút nổi góc dưới phải mở sheet trượt lên từ đáy màn hình (overlay + nút đóng),
 *   không chiếm chỗ layout chính khi đóng, vùng chạm ≥ 44px.
 *
 * State ghim/bỏ ghim nằm ở trang cha (`useWatchlist`) để dùng chung với nút ghim trên header; ở đây
 * chỉ nhận `symbols` + `onUnpin` rồi fetch giá/tín hiệu qua `useWatchlistRows`.
 */
export function Watchlist({ symbols, timeframe, onUnpin }: WatchlistProps) {
  const state = useWatchlistRows(symbols, timeframe);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTitleId = useId();

  // Đóng sheet bằng phím Esc (chuẩn a11y cho lớp phủ dạng dialog trên mobile).
  useEffect(() => {
    if (!sheetOpen) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setSheetOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen]);

  return (
    <>
      {/* Desktop: cột phải, không đè chart */}
      <aside className="hidden w-72 shrink-0 md:block" aria-label="Danh sách theo dõi">
        <div className="border-border bg-background sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col gap-2 overflow-y-auto rounded-lg border p-3">
          <WatchlistHeading count={symbols.length} />
          <WatchlistPanel state={state} onUnpin={onUnpin} />
        </div>
      </aside>

      {/* Mobile: nút nổi mở sheet */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="Mở danh sách theo dõi"
        aria-expanded={sheetOpen}
        className="border-border bg-surface text-foreground fixed right-4 bottom-4 z-40 flex min-h-11 items-center gap-2 rounded-full border px-4 shadow-lg md:hidden"
      >
        <span aria-hidden="true">☆</span>
        <span className="text-sm font-medium">Theo dõi</span>
        {symbols.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
            {symbols.length}
          </span>
        )}
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay — chạm ra ngoài để đóng */}
          <button
            type="button"
            aria-label="Đóng danh sách theo dõi"
            onClick={() => setSheetOpen(false)}
            className="bg-background/70 absolute inset-0 h-full w-full"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
            className="bg-background border-border absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col gap-2 rounded-t-2xl border-t p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2">
              <div id={sheetTitleId}>
                <WatchlistHeading count={symbols.length} />
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Đóng danh sách theo dõi"
                className="border-border text-foreground hover:bg-surface flex min-h-11 min-w-11 items-center justify-center rounded-md border text-lg"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="overflow-y-auto">
              <WatchlistPanel state={state} onUnpin={onUnpin} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
