'use client';

import Link from 'next/link';
import type { SignalDirection } from '@/lib/analysis';
import type { ScreenerRow } from '@/lib/screener/row';
import type { WatchlistRow, WatchlistRowsState } from '@/components/watchlist/use-watchlist-rows';

interface WatchlistPanelProps {
  state: WatchlistRowsState;
  onUnpin: (symbol: string) => void;
}

const usdFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

function formatPrice(price: number | null, currency: ScreenerRow['currency']): string {
  if (price === null) return '—';
  return currency === 'VND' ? `${vndFormatter.format(price)} đ` : `$${usdFormatter.format(price)}`;
}

function formatChangePercent(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function changeToneClass(value: number | null): string {
  if (value === null || value === 0) return 'text-muted-foreground';
  return value > 0 ? 'text-success' : 'text-danger';
}

const DIRECTION_LABEL: Record<SignalDirection, string> = {
  buy: 'Mua',
  sell: 'Bán',
  neutral: 'Trung lập',
};

const DIRECTION_BADGE: Record<SignalDirection, string> = {
  buy: 'border-success/60 bg-success/10 text-foreground',
  sell: 'border-danger/60 bg-danger/10 text-foreground',
  neutral: 'border-border bg-surface text-foreground',
};

function WatchlistRowItem({
  row,
  onUnpin,
}: {
  row: WatchlistRow;
  onUnpin: (symbol: string) => void;
}) {
  return (
    <li className="border-border flex items-stretch gap-1 border-b last:border-0">
      <Link
        href={`/chart/${row.slug}`}
        className="hover:bg-surface flex min-h-11 flex-1 flex-col justify-center gap-0.5 rounded-md px-2 py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground font-medium">{row.label}</span>
          <span className="text-foreground tabular-nums">
            {formatPrice(row.latestClose, row.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {row.direction ? (
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs ${DIRECTION_BADGE[row.direction]}`}
            >
              {DIRECTION_LABEL[row.direction]}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
          <span className={`text-xs tabular-nums ${changeToneClass(row.changePercent)}`}>
            {formatChangePercent(row.changePercent)}
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onUnpin(row.symbol)}
        aria-label={`Bỏ ghim ${row.label} khỏi danh sách theo dõi`}
        title="Bỏ ghim"
        className="border-border text-muted-foreground hover:bg-surface hover:text-foreground my-1 flex min-h-11 min-w-11 items-center justify-center rounded-md border text-lg"
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}

/**
 * Nội dung danh sách theo dõi (W-509) — dùng chung cho cả cột phải desktop lẫn sheet mobile. Đủ 4
 * trạng thái: `idle` (chưa ghim mã nào) → gợi ý cách ghim; `loading`; `error` (tất cả mã lỗi);
 * `success` → danh sách. Mỗi dòng: mã + giá + tín hiệu + ±%, click điều hướng `/chart/{slug}`, nút ×
 * bỏ ghim (tách khỏi vùng click điều hướng để không lồng phần tử tương tác).
 */
export function WatchlistPanel({ state, onUnpin }: WatchlistPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      {state.status === 'idle' && (
        <p className="text-muted-foreground px-2 py-4 text-sm">
          Chưa ghim mã nào. Bấm ngôi sao ☆ cạnh tên mã để thêm vào danh sách theo dõi.
        </p>
      )}

      {state.status === 'loading' && (
        <p role="status" aria-live="polite" className="text-muted-foreground px-2 py-4 text-sm">
          Đang tải danh sách theo dõi…
        </p>
      )}

      {state.status === 'error' && (
        <p role="alert" className="text-danger px-2 py-4 text-sm">
          Không tải được danh sách theo dõi: {state.error}
        </p>
      )}

      {state.status === 'success' && (
        <ul className="flex flex-col">
          {state.rows.map((row) => (
            <WatchlistRowItem key={row.symbol} row={row} onUnpin={onUnpin} />
          ))}
        </ul>
      )}
    </div>
  );
}
