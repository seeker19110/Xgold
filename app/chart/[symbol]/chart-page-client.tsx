'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnalysisPanel } from '@/components/chart/analysis-panel';
import { ConfluencePanel } from '@/components/chart/confluence-panel';
import { GoldChart } from '@/components/chart/gold-chart';
import { IndicatorPanel } from '@/components/chart/indicator-panel';
import { SymbolSwitcher } from '@/components/chart/symbol-switcher';
import { TimeframeSwitcher } from '@/components/chart/timeframe-switcher';
import { useCandles } from '@/components/chart/use-candles';
import { useIndicatorConfig } from '@/components/chart/use-indicator-config';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Timeframe } from '@/lib/candles/types';

interface ChartPageClientProps {
  /** Mã chuẩn (CSDL/provider), vd 'XAUUSD'. */
  symbol: string;
  /** Slug URL hiện tại, vd 'xauusd' (để SymbolSwitcher tô đậm mã đang xem). */
  slug: string;
  /** Nhãn ngắn hiển thị tiêu đề, vd 'XAU/USD'. */
  label: string;
  /** Cụm mô tả aria-label chart, vd 'giá vàng XAU/USD'. */
  chartLabel: string;
}

export function ChartPageClient({ symbol, slug, label, chartLabel }: ChartPageClientProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const { status, candles, source, error } = useCandles(symbol, timeframe);
  const [config, setConfig] = useIndicatorConfig();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← Xgold
        </Link>
        <h1 className="text-2xl font-semibold">{label}</h1>
      </div>

      <SymbolSwitcher currentSlug={slug} />

      {source === 'sample' && (
        <p
          role="status"
          className="bg-warning/10 border-warning/40 text-foreground rounded-md border px-3 py-2 text-sm"
        >
          Đang hiển thị <strong>dữ liệu mẫu</strong> (chưa kết nối Supabase) — không phải giá thật.
        </p>
      )}

      {status === 'loading' && (
        // min-h khớp xấp xỉ chiều cao chart (560px) + IndicatorPanel (~320px, xem gold-chart.tsx +
        // indicator-panel.tsx) — thiếu bước này, chuyển từ trạng thái tải sang thành công làm cả
        // trang giãn ra đột ngột, đo thật bằng Lighthouse ra CLS 0.324 (ngưỡng 0.1), xem F-010
        // (docs/ops/COMPLETION-PLAN.md).
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex min-h-[900px] items-center justify-center"
        >
          Đang tải dữ liệu…
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="border-danger text-danger flex min-h-[900px] items-center justify-center rounded-lg border"
        >
          Không tải được dữ liệu: {error}
        </div>
      )}

      {status === 'success' && candles.length === 0 && (
        <div
          role="status"
          className="text-muted-foreground border-border flex min-h-[900px] items-center justify-center rounded-lg border border-dashed"
        >
          Chưa có dữ liệu cho khung thời gian này.
        </div>
      )}

      {status === 'success' && candles.length > 0 && (
        <>
          <GoldChart candles={candles} config={config} label={chartLabel} />
          <AnalysisPanel
            candles={candles}
            timeframe={timeframe}
            config={config.analysis}
            onChange={(analysis) => setConfig({ ...config, analysis })}
          />
          <ConfluencePanel symbol={symbol} label={label} config={config.analysis} />
          <IndicatorPanel config={config} onChange={setConfig} />
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <TimeframeSwitcher value={timeframe} onChange={setTimeframe} />
        <ThemeToggle />
      </div>
    </main>
  );
}
