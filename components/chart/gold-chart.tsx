'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/candles/types';
import type { ChartConfig } from '@/lib/indicators/config';
import { sma, ema, rsi, type IndicatorPoint } from '@/lib/indicators';

interface GoldChartProps {
  candles: readonly Candle[];
  config: ChartConfig;
}

interface ThemeColors {
  background: string;
  foreground: string;
  border: string;
  success: string;
  danger: string;
}

const RSI_PANE_INDEX = 1;

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

function toUtcTimestamp(ts: string): UTCTimestamp {
  return Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp;
}

function toLineData(points: readonly IndicatorPoint[]): { time: UTCTimestamp; value: number }[] {
  const data: { time: UTCTimestamp; value: number }[] = [];
  for (const p of points) {
    if (p.value !== null) data.push({ time: toUtcTimestamp(p.ts), value: p.value });
  }
  return data;
}

/**
 * Chart nến (lightweight-charts v5) + Multi-MA chồng lên pane giá + Multi-RSI ở pane phụ.
 * Tự đồng bộ màu theo theme Dark blue/Light đang chọn.
 */
export function GoldChart({ candles, config }: GoldChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const rsiSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const rsiThresholdRef = useRef<{
    upper: ISeriesApi<'Line'> | null;
    lower: ISeriesApi<'Line'> | null;
  }>({
    upper: null,
    lower: null,
  });

  // Effect 1: dựng chart + series nến một lần; dọn dẹp khi unmount.
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
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.success,
      downColor: colors.danger,
      borderVisible: false,
      wickUpColor: colors.success,
      wickDownColor: colors.danger,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const observer = new MutationObserver(() => {
      const next = readThemeColors();
      chart.applyOptions({
        layout: { background: { color: next.background }, textColor: next.foreground },
        grid: { vertLines: { color: next.border }, horzLines: { color: next.border } },
      });
      candleSeries.applyOptions({
        upColor: next.success,
        downColor: next.danger,
        wickUpColor: next.success,
        wickDownColor: next.danger,
      });
      const thresholds = rsiThresholdRef.current;
      thresholds.upper?.applyOptions({ color: next.border });
      thresholds.lower?.applyOptions({ color: next.border });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      // maSeriesRef/rsiSeriesRef là Map bền vững suốt vòng đời component (không phải node DOM) —
      // muốn đọc nội dung MỚI NHẤT lúc dọn dẹp (chart.remove() đã tự hủy mọi series bên trong nó),
      // không phải chụp nhanh lúc effect chạy — cảnh báo exhaustive-deps không áp dụng ở đây.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      maSeriesRef.current.clear();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      rsiSeriesRef.current.clear();
      rsiThresholdRef.current = { upper: null, lower: null };
    };
  }, []);

  // Effect 2: dữ liệu nến.
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    series.setData(
      candles.map((c) => ({
        time: toUtcTimestamp(c.ts),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Effect 3: Multi-MA — thêm/xóa/cập nhật đường theo config.maLines, chồng lên pane giá (0).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const wantedIds = new Set(config.maLines.map((l) => l.id));
    for (const [id, series] of maSeriesRef.current) {
      if (!wantedIds.has(id)) {
        chart.removeSeries(series);
        maSeriesRef.current.delete(id);
      }
    }

    for (const line of config.maLines) {
      const points = line.type === 'SMA' ? sma(candles, line.period) : ema(candles, line.period);
      const data = line.visible ? toLineData(points) : [];

      let series = maSeriesRef.current.get(line.id);
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: line.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        maSeriesRef.current.set(line.id, series);
      } else {
        series.applyOptions({ color: line.color });
      }
      series.setData(data);
    }
  }, [candles, config.maLines]);

  // Effect 4: Multi-RSI — pane phụ (1) + 2 vạch ngưỡng 30/70, tự thêm/xóa pane theo rsiLines.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const hasRsi = config.rsiLines.length > 0;
    const thresholds = rsiThresholdRef.current;
    const colors = readThemeColors();

    if (hasRsi && !thresholds.upper) {
      const lineOpts = {
        color: colors.border,
        lineWidth: 1 as const,
        lineStyle: 2, // dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      };
      thresholds.upper = chart.addSeries(LineSeries, lineOpts, RSI_PANE_INDEX);
      thresholds.lower = chart.addSeries(LineSeries, lineOpts, RSI_PANE_INDEX);
    }
    if (!hasRsi && thresholds.upper && thresholds.lower) {
      chart.removeSeries(thresholds.upper);
      chart.removeSeries(thresholds.lower);
      thresholds.upper = null;
      thresholds.lower = null;
    }
    if (thresholds.upper && thresholds.lower) {
      const times = candles.map((c) => toUtcTimestamp(c.ts));
      thresholds.upper.setData(times.map((time) => ({ time, value: 70 })));
      thresholds.lower.setData(times.map((time) => ({ time, value: 30 })));
    }

    const wantedIds = new Set(config.rsiLines.map((l) => l.id));
    for (const [id, series] of rsiSeriesRef.current) {
      if (!wantedIds.has(id)) {
        chart.removeSeries(series);
        rsiSeriesRef.current.delete(id);
      }
    }

    for (const line of config.rsiLines) {
      const points = rsi(candles, line.period);
      const data = line.visible ? toLineData(points) : [];

      let series = rsiSeriesRef.current.get(line.id);
      if (!series) {
        series = chart.addSeries(
          LineSeries,
          { color: line.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false },
          RSI_PANE_INDEX,
        );
        rsiSeriesRef.current.set(line.id, series);
      } else {
        series.applyOptions({ color: line.color });
      }
      series.setData(data);
    }
  }, [candles, config.rsiLines]);

  return (
    <div
      ref={containerRef}
      className="h-[560px] w-full min-w-0"
      role="group"
      aria-label="Chart nến giá vàng XAU/USD với Multi-MA và Multi-RSI"
    />
  );
}
