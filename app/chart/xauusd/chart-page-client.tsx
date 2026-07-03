'use client';

import { useState } from 'react';
import { GoldChart } from '@/components/chart/gold-chart';
import { TimeframeSwitcher } from '@/components/chart/timeframe-switcher';
import { useCandles } from '@/components/chart/use-candles';
import type { Timeframe } from '@/lib/candles/types';

const SYMBOL = 'XAUUSD';

export function ChartPageClient() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const { status, candles, source, error } = useCandles(SYMBOL, timeframe);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">XAU/USD</h1>
        <TimeframeSwitcher value={timeframe} onChange={setTimeframe} />
      </div>

      {source === 'sample' && (
        <p
          role="status"
          className="bg-warning/10 border-warning/40 text-foreground rounded-md border px-3 py-2 text-sm"
        >
          Đang hiển thị <strong>dữ liệu mẫu</strong> (chưa kết nối Supabase) — không phải giá thật.
        </p>
      )}

      {status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex h-[420px] items-center justify-center"
        >
          Đang tải dữ liệu…
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="border-danger text-danger flex h-[420px] items-center justify-center rounded-lg border"
        >
          Không tải được dữ liệu: {error}
        </div>
      )}

      {status === 'success' && candles.length === 0 && (
        <div
          role="status"
          className="text-muted-foreground border-border flex h-[420px] items-center justify-center rounded-lg border border-dashed"
        >
          Chưa có dữ liệu cho khung thời gian này.
        </div>
      )}

      {status === 'success' && candles.length > 0 && <GoldChart candles={candles} />}
    </main>
  );
}
