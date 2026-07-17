'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { IChartApi } from 'lightweight-charts';
import { AnalysisPanel } from '@/components/chart/analysis-panel';
import { ChartTypeSwitcher } from '@/components/chart/chart-type-switcher';
import { CompareSwitcher } from '@/components/chart/compare-switcher';
import { ConfluencePanel } from '@/components/chart/confluence-panel';
import { GoldChart } from '@/components/chart/gold-chart';
import { IndicatorPanel } from '@/components/chart/indicator-panel';
import { SymbolSwitcher } from '@/components/chart/symbol-switcher';
import { TimeframeSwitcher } from '@/components/chart/timeframe-switcher';
import { useCandles } from '@/components/chart/use-candles';
import { useCompareCandles } from '@/components/chart/use-compare-candles';
import { useIndicatorConfig } from '@/components/chart/use-indicator-config';
import { ThemeToggle } from '@/components/theme-toggle';
import { candlesCsvFileName, candlesToCsv } from '@/lib/candles/csv';
import { normalizeToPercent } from '@/lib/candles/percent-normalize';
import type { Timeframe } from '@/lib/candles/types';
import { getInstrumentBySymbol } from '@/lib/instruments';

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

  // So sánh mã (W-507): mã phụ chỉ tồn tại trong phiên xem (không lưu vào ChartConfig/URL ở v1 —
  // giảm độ phức tạp, mất khi reload; xem ghi chú PR). Đổi mã chính = điều hướng route mới → remount
  // → compareSymbol tự về null. Không cần đồng bộ thủ công.
  const [compareSymbol, setCompareSymbol] = useState<string | null>(null);
  const compare = useCompareCandles(compareSymbol, timeframe);
  const compareLabel = compareSymbol ? getInstrumentBySymbol(compareSymbol)?.label : undefined;
  // Chuẩn hoá % trên TOÀN BỘ mảng nến mã phụ đang có (khung nhìn hiện tại, không phải phần zoom) —
  // đúng phạm vi v1. Chỉ tính khi fetch thành công; các trạng thái khác → rỗng (đường bị gỡ).
  const compareData = useMemo(
    () => (compare.status === 'success' ? normalizeToPercent(compare.candles) : []),
    [compare.status, compare.candles],
  );

  // Fullscreen (W-505): áp lên container bọc GoldChart (không phải cả trang) — trình duyệt tự ẩn
  // header/breadcrumb vì chúng nằm ngoài subtree được fullscreen. `isFullscreen` đồng bộ qua sự kiện
  // 'fullscreenchange' (bấm nút, Esc, hoặc trình duyệt tự thoát đều cập nhật đúng).
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartApiRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === fullscreenContainerRef.current);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  function handleToggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const container = fullscreenContainerRef.current;
    // Fallback nếu trình duyệt không hỗ trợ Fullscreen API: nút vẫn hiện nhưng bấm không có tác dụng.
    if (!container || typeof container.requestFullscreen !== 'function') return;
    void container.requestFullscreen();
  }

  function handleExportCsv() {
    const blob = new Blob([candlesToCsv(candles)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = candlesCsvFileName(symbol, timeframe);
    // appendChild trước khi click: Firefox và một số trình duyệt cũ bỏ qua click() trên <a download>
    // chưa gắn vào DOM (F-011).
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handleScreenshot() {
    const chart = chartApiRef.current;
    // Guard: chart chưa sẵn sàng hoặc typings/runtime thiếu takeScreenshot → không throw.
    if (!chart || typeof chart.takeScreenshot !== 'function') return;
    const canvas = chart.takeScreenshot();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${symbol.toLowerCase()}-${timeframe}-chart.png`;
      // Cùng thứ tự appendChild → click → removeChild đã sửa ở F-011 (xem handleExportCsv).
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    });
  }

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CompareSwitcher
                currentSymbol={symbol}
                value={compareSymbol}
                onChange={setCompareSymbol}
              />
              {compare.status === 'loading' && (
                <p role="status" aria-live="polite" className="text-muted-foreground text-xs">
                  Đang tải mã so sánh…
                </p>
              )}
              {compare.status === 'error' && (
                <p role="alert" className="text-danger text-xs">
                  Không tải được mã so sánh: {compare.error}
                </p>
              )}
              {compare.status === 'success' && compare.candles.length === 0 && (
                <p role="status" className="text-muted-foreground text-xs">
                  Mã so sánh chưa có dữ liệu cho khung này.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="border-border text-foreground hover:bg-surface rounded-md border px-3 py-1.5 text-sm"
            >
              Xuất CSV
            </button>
          </div>
          <div
            ref={fullscreenContainerRef}
            className={
              isFullscreen
                ? 'bg-background flex h-full w-full flex-col gap-2 p-2'
                : 'flex flex-col gap-2'
            }
          >
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-pressed={isFullscreen}
                aria-label="Toàn màn hình"
                className="border-border text-foreground hover:bg-surface min-h-11 min-w-11 rounded-md border px-3 py-1.5 text-sm"
              >
                {isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              </button>
              <button
                type="button"
                onClick={handleScreenshot}
                aria-label="Chụp ảnh chart"
                className="border-border text-foreground hover:bg-surface min-h-11 min-w-11 rounded-md border px-3 py-1.5 text-sm"
              >
                Chụp ảnh chart
              </button>
            </div>
            <GoldChart
              candles={candles}
              config={config}
              label={chartLabel}
              timeframe={timeframe}
              fullscreenActive={isFullscreen}
              compareData={compareData}
              compareLabel={compareLabel}
              onChartReady={(chart) => {
                chartApiRef.current = chart;
              }}
            />
          </div>
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
        <ChartTypeSwitcher
          value={config.chartType}
          onChange={(chartType) => setConfig({ ...config, chartType })}
        />
        <TimeframeSwitcher value={timeframe} onChange={setTimeframe} />
        <button
          type="button"
          onClick={() =>
            setConfig({
              ...config,
              priceScaleMode: config.priceScaleMode === 'logarithmic' ? 'normal' : 'logarithmic',
            })
          }
          aria-pressed={config.priceScaleMode === 'logarithmic'}
          aria-label="Chuyển thang giá Log/Linear"
          className={
            config.priceScaleMode === 'logarithmic'
              ? 'bg-primary text-primary-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
              : 'text-muted-foreground hover:text-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
          }
        >
          Log
        </button>
        <ThemeToggle />
      </div>
    </main>
  );
}
