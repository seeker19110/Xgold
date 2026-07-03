'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/candles/types';

interface GoldChartProps {
  candles: readonly Candle[];
}

interface ThemeColors {
  background: string;
  foreground: string;
  border: string;
  success: string;
  danger: string;
}

function readThemeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    background: get('--background', '#0b1220'),
    foreground: get('--foreground', '#e8eef8'),
    border: get('--border', '#243049'),
    success: get('--success', '#4ade80'),
    danger: get('--danger', '#f87171'),
  };
}

/** Chart nến (lightweight-charts v5), tự đồng bộ màu theo theme Dark blue/Light đang chọn. */
export function GoldChart({ candles }: GoldChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colors = readThemeColors();
    const chart = createChart(container, {
      autoSize: true,
      layout: { background: { color: colors.background }, textColor: colors.foreground },
      grid: { vertLines: { color: colors.border }, horzLines: { color: colors.border } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.success,
      downColor: colors.danger,
      borderVisible: false,
      wickUpColor: colors.success,
      wickDownColor: colors.danger,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Đồng bộ màu chart khi người dùng đổi Dark blue ↔ Light (ThemeToggle chỉ đặt data-theme trên
    // <html>, không re-render React) — quan sát đổi attribute thay vì poll.
    const observer = new MutationObserver(() => {
      const next = readThemeColors();
      chart.applyOptions({
        layout: { background: { color: next.background }, textColor: next.foreground },
        grid: { vertLines: { color: next.border }, horzLines: { color: next.border } },
      });
      series.applyOptions({
        upColor: next.success,
        downColor: next.danger,
        wickUpColor: next.success,
        wickDownColor: next.danger,
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(
      candles.map((c) => ({
        time: Math.floor(new Date(c.ts).getTime() / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    // role="group" (không phải "img"): lightweight-charts tự thêm phần tử con có thể focus (tương
    // tác zoom/pan bằng bàn phím) — role="img" không hợp lệ khi có descendant focus được (axe:
    // nested-interactive).
    <div
      ref={containerRef}
      className="h-[420px] w-full min-w-0"
      role="group"
      aria-label="Chart nến giá vàng XAU/USD"
    />
  );
}
