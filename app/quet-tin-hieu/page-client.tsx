'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScreenerTable } from '@/components/screener/screener-table';
import { MarketContext } from '@/components/screener/market-context';
import { useScreener } from '@/components/screener/use-screener';
import { TimeframeSwitcher } from '@/components/chart/timeframe-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Timeframe } from '@/lib/candles/types';

export function ScreenerPageClient() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const { status, rows, marketContext, error } = useScreener(timeframe);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← Xgold
          </Link>
          <h1 className="text-2xl font-semibold">Quét tín hiệu</h1>
        </div>
        <ThemeToggle />
      </div>

      <p className="text-muted-foreground text-sm">
        Tín hiệu kỹ thuật hiện tại của mọi mã đang theo dõi, theo khung thời gian đang chọn — quét
        cả bảng thay vì xem từng chart.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeframeSwitcher value={timeframe} onChange={setTimeframe} />
      </div>

      {status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex min-h-[320px] items-center justify-center"
        >
          Đang quét tín hiệu…
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="border-danger text-danger flex min-h-[320px] items-center justify-center rounded-lg border"
        >
          Không quét được tín hiệu: {error}
        </div>
      )}

      {status === 'success' && rows.length === 0 && (
        <div
          role="status"
          className="text-muted-foreground border-border flex min-h-[320px] items-center justify-center rounded-lg border border-dashed"
        >
          Chưa có mã nào để quét.
        </div>
      )}

      {status === 'success' && rows.length > 0 && (
        <>
          <ScreenerTable rows={rows} />
          {marketContext && <MarketContext candles={marketContext} />}
        </>
      )}
    </main>
  );
}
