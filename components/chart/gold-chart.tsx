'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/candles/types';
import type { ChartConfig } from '@/lib/indicators/config';
import { sma, ema, rsi, macd, bollinger, type IndicatorPoint } from '@/lib/indicators';
import { signalEvents } from '@/lib/analysis';

interface GoldChartProps {
  candles: readonly Candle[];
  config: ChartConfig;
  /** Cụm mô tả cho aria-label, vd 'giá vàng XAU/USD' (ghép vào "Chart nến {label} …"). */
  label: string;
}

interface ThemeColors {
  background: string;
  foreground: string;
  border: string;
  success: string;
  danger: string;
}

const RSI_PANE_INDEX = 1;

// Màu cố định cho BB/MACD (không cấu hình màu ở v1 — khác Multi-MA/RSI vốn mỗi đường một màu).
const BB_COLOR = '#94a3b8';
const MACD_LINE_COLOR = '#38bdf8';
const MACD_SIGNAL_COLOR = '#fb923c';
const MACD_HIST_UP_COLOR = 'rgba(74, 222, 128, 0.6)';
const MACD_HIST_DOWN_COLOR = 'rgba(248, 113, 113, 0.6)';
const MARKER_BUY_COLOR = '#4ade80';
const MARKER_SELL_COLOR = '#f87171';

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
export function GoldChart({ candles, config, label }: GoldChartProps) {
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
  const bbSeriesRef = useRef<{
    basis: ISeriesApi<'Line'> | null;
    upper: ISeriesApi<'Line'> | null;
    lower: ISeriesApi<'Line'> | null;
  }>({ basis: null, upper: null, lower: null });
  const macdSeriesRef = useRef<{
    line: ISeriesApi<'Line'> | null;
    signal: ISeriesApi<'Line'> | null;
    histogram: ISeriesApi<'Histogram'> | null;
    paneIndex: number;
  }>({ line: null, signal: null, histogram: null, paneIndex: -1 });
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

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
      bbSeriesRef.current = { basis: null, upper: null, lower: null };
      macdSeriesRef.current = { line: null, signal: null, histogram: null, paneIndex: -1 };
      markersRef.current = null;
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

  // Effect 5: Bollinger Bands — 3 đường (basis nét đứt, upper/lower) chồng lên pane giá (0).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const bb = bbSeriesRef.current;
    const { visible, period, multiplier } = config.bollinger;

    if (visible && !bb.basis) {
      const baseOpts = {
        color: BB_COLOR,
        lineWidth: 1 as const,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      };
      bb.basis = chart.addSeries(LineSeries, { ...baseOpts, lineStyle: 2 });
      bb.upper = chart.addSeries(LineSeries, baseOpts);
      bb.lower = chart.addSeries(LineSeries, baseOpts);
    }
    if (!visible && bb.basis) {
      for (const series of [bb.basis, bb.upper, bb.lower]) {
        if (series) chart.removeSeries(series);
      }
      bbSeriesRef.current = { basis: null, upper: null, lower: null };
      return;
    }
    if (!bb.basis || !bb.upper || !bb.lower) return;

    const points = bollinger(candles, period, multiplier);
    bb.basis.setData(
      points.flatMap((p) =>
        p.basis !== null ? [{ time: toUtcTimestamp(p.ts), value: p.basis }] : [],
      ),
    );
    bb.upper.setData(
      points.flatMap((p) =>
        p.upper !== null ? [{ time: toUtcTimestamp(p.ts), value: p.upper }] : [],
      ),
    );
    bb.lower.setData(
      points.flatMap((p) =>
        p.lower !== null ? [{ time: toUtcTimestamp(p.ts), value: p.lower }] : [],
      ),
    );
  }, [candles, config.bollinger]);

  // Effect 6: MACD — pane phụ riêng (sau pane RSI nếu có). Không có API dời series giữa các pane
  // trong lightweight-charts v5 nên khi bố cục pane đổi (thêm/bỏ RSI) thì gỡ và tạo lại series —
  // sự kiện hiếm, dữ liệu nhỏ, đổi lấy code đơn giản đúng.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const state = macdSeriesRef.current;
    const { visible, fast, slow, signal } = config.macd;
    const desiredPane = config.rsiLines.length > 0 ? RSI_PANE_INDEX + 1 : RSI_PANE_INDEX;

    const removeAll = () => {
      for (const series of [state.histogram, state.line, state.signal]) {
        if (series) chart.removeSeries(series);
      }
      macdSeriesRef.current = { line: null, signal: null, histogram: null, paneIndex: -1 };
    };

    if (state.line && (!visible || state.paneIndex !== desiredPane)) removeAll();
    if (!visible) return;

    const current = macdSeriesRef.current;
    if (!current.line) {
      const lineOpts = { lineWidth: 2 as const, priceLineVisible: false, lastValueVisible: false };
      current.histogram = chart.addSeries(
        HistogramSeries,
        { priceLineVisible: false },
        desiredPane,
      );
      current.line = chart.addSeries(
        LineSeries,
        { ...lineOpts, color: MACD_LINE_COLOR },
        desiredPane,
      );
      current.signal = chart.addSeries(
        LineSeries,
        { ...lineOpts, color: MACD_SIGNAL_COLOR },
        desiredPane,
      );
      current.paneIndex = desiredPane;
    }
    if (!current.line || !current.signal || !current.histogram) return;

    const points = macd(candles, fast, slow, signal);
    current.line.setData(
      points.flatMap((p) =>
        p.macd !== null ? [{ time: toUtcTimestamp(p.ts), value: p.macd }] : [],
      ),
    );
    current.signal.setData(
      points.flatMap((p) =>
        p.signal !== null ? [{ time: toUtcTimestamp(p.ts), value: p.signal }] : [],
      ),
    );
    current.histogram.setData(
      points.flatMap((p) =>
        p.histogram !== null
          ? [
              {
                time: toUtcTimestamp(p.ts),
                value: p.histogram,
                color: p.histogram >= 0 ? MACD_HIST_UP_COLOR : MACD_HIST_DOWN_COLOR,
              },
            ]
          : [],
      ),
    );
  }, [candles, config.macd, config.rsiLines.length]);

  // Effect 7: markers tín hiệu Mua/Bán trên nến — các thời điểm phân loại tổng hợp của engine
  // phân tích (lib/analysis) chuyển sang Mua/Bán. Tắt phân tích → xóa markers.
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    if (!markersRef.current) markersRef.current = createSeriesMarkers(series, []);

    if (!config.analysis.enabled) {
      markersRef.current.setMarkers([]);
      return;
    }

    const markers: SeriesMarker<Time>[] = signalEvents(candles, config.analysis).map((event) => ({
      time: toUtcTimestamp(event.ts),
      position: event.direction === 'buy' ? 'belowBar' : 'aboveBar',
      color: event.direction === 'buy' ? MARKER_BUY_COLOR : MARKER_SELL_COLOR,
      shape: event.direction === 'buy' ? 'arrowUp' : 'arrowDown',
      text: event.direction === 'buy' ? 'Mua' : 'Bán',
    }));
    markersRef.current.setMarkers(markers);
  }, [candles, config.analysis]);

  return (
    <div
      ref={containerRef}
      className="h-[560px] w-full min-w-0"
      role="group"
      aria-label={`Chart nến ${label} với Multi-MA và Multi-RSI`}
    />
  );
}
