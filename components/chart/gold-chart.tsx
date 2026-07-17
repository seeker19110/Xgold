'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/candles/types';
import { formatLegendChange, formatLegendPrice, legendAt } from '@/lib/candles/legend';
import type { ChartConfig } from '@/lib/indicators/config';
import {
  sma,
  ema,
  rsi,
  macd,
  bollinger,
  ichimokuCloud,
  type IndicatorPoint,
} from '@/lib/indicators';
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
const ICHIMOKU_SPAN_A_COLOR = '#f5cf0e';
const ICHIMOKU_SPAN_B_COLOR = '#f10f0f';
// Thanh khối lượng mờ để không lấn át nến (overlay 20% đáy pane giá — bố cục mặc định TradingView).
const VOLUME_UP_COLOR = 'rgba(74, 222, 128, 0.35)';
const VOLUME_DOWN_COLOR = 'rgba(248, 113, 113, 0.35)';

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
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  // Tra chỉ số nến theo mốc thời gian cho crosshair → legend OHLC (cập nhật ở Effect 2).
  const timeToIndexRef = useRef<Map<number, number>>(new Map());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const ichimokuSeriesRef = useRef<{
    spanA: ISeriesApi<'Line'> | null;
    spanB: ISeriesApi<'Line'> | null;
  }>({ spanA: null, spanB: null });

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

    // Legend OHLC kiểu TradingView: rê crosshair → hiện nến dưới con trỏ; rời chart → nến mới nhất.
    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      const index =
        typeof param.time === 'number' ? timeToIndexRef.current.get(param.time) : undefined;
      setHoveredIndex(index ?? null);
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

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
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
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
      ichimokuSeriesRef.current = { spanA: null, spanB: null };
    };
  }, []);

  // Effect 2: dữ liệu nến + map thời gian→chỉ số cho legend (đổi dữ liệu thì bỏ trạng thái hover cũ).
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    const timeToIndex = new Map<number, number>();
    series.setData(
      candles.map((c, i) => {
        const time = toUtcTimestamp(c.ts);
        timeToIndex.set(time, i);
        return { time, open: c.open, high: c.high, low: c.low, close: c.close };
      }),
    );
    timeToIndexRef.current = timeToIndex;
    // Nến cũ không còn — index hover cũ trỏ nhầm nến mới; đặt lại về "nến mới nhất".
    setHoveredIndex(null);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Effect 2a: thang giá Log/Linear (W-503) — áp lên price scale phải (thang giá nến), tách khỏi
  // thang giá 'volume' riêng (Effect 2b) để không kéo méo cột khối lượng khi bật log.
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    series.priceScale().applyOptions({
      mode:
        config.priceScaleMode === 'logarithmic'
          ? PriceScaleMode.Logarithmic
          : PriceScaleMode.Normal,
    });
  }, [config.priceScaleMode]);

  // Effect 2b: thanh khối lượng — overlay 20% đáy pane giá (bố cục TradingView), thang giá riêng
  // 'volume' để không kéo méo thang giá nến. Nến thiếu volume (null) thì bỏ qua điểm đó.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (config.volume.visible && !volumeSeriesRef.current) {
      const series = chart.addSeries(HistogramSeries, {
        priceScaleId: 'volume',
        priceFormat: { type: 'volume' },
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volumeSeriesRef.current = series;
    }
    if (!config.volume.visible && volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
      return;
    }
    const series = volumeSeriesRef.current;
    if (!series) return;

    series.setData(
      candles.flatMap((c) =>
        c.volume != null
          ? [
              {
                time: toUtcTimestamp(c.ts),
                value: c.volume,
                color: c.close >= c.open ? VOLUME_UP_COLOR : VOLUME_DOWN_COLOR,
              },
            ]
          : [],
      ),
    );
  }, [candles, config.volume]);

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

  // Effect: mây Ichimoku (ADR-0011) — Span A/B chồng lên pane giá (0), DỊCH tới trước
  // `displacement` nến (đúng cách Ichimoku vẽ). lightweight-charts không hỗ trợ `offset` như Pine
  // Script nên tự tính mốc thời gian tương lai cho phần nhô ra ngoài dữ liệu nến hiện có (khoảng
  // cách suy từ 2 nến cuối — đúng với mọi khung thời gian, không cần bảng tra cứu). Không tô màu
  // vùng giữa 2 đường ở v1 (nhất quán với Bollinger — cũng chỉ vẽ đường, không tô).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const state = ichimokuSeriesRef.current;
    const { visible, conversionPeriod, basePeriod, spanBPeriod, displacement } = config.ichimoku;

    if (visible && !state.spanA) {
      const opts = {
        lineWidth: 1 as const,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      };
      state.spanA = chart.addSeries(LineSeries, { ...opts, color: ICHIMOKU_SPAN_A_COLOR });
      state.spanB = chart.addSeries(LineSeries, { ...opts, color: ICHIMOKU_SPAN_B_COLOR });
    }
    if (!visible && state.spanA) {
      if (state.spanA) chart.removeSeries(state.spanA);
      if (state.spanB) chart.removeSeries(state.spanB);
      ichimokuSeriesRef.current = { spanA: null, spanB: null };
      return;
    }
    if (!state.spanA || !state.spanB || candles.length === 0) return;

    const last = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : undefined;
    if (!last) return;
    const lastTs = toUtcTimestamp(last.ts);
    const intervalSeconds = prev ? Math.max(1, lastTs - toUtcTimestamp(prev.ts)) : 86400;

    function displacedTime(index: number): UTCTimestamp {
      const shifted = index + displacement;
      const candle = candles[shifted];
      if (candle) return toUtcTimestamp(candle.ts);
      const beyond = shifted - candles.length + 1;
      return (lastTs + beyond * intervalSeconds) as UTCTimestamp;
    }

    const points = ichimokuCloud(candles, conversionPeriod, basePeriod, spanBPeriod);
    const spanAData: { time: UTCTimestamp; value: number }[] = [];
    const spanBData: { time: UTCTimestamp; value: number }[] = [];
    points.forEach((p, i) => {
      const time = displacedTime(i);
      if (p.spanA !== null) spanAData.push({ time, value: p.spanA });
      if (p.spanB !== null) spanBData.push({ time, value: p.spanB });
    });
    state.spanA.setData(spanAData);
    state.spanB.setData(spanBData);
  }, [candles, config.ichimoku]);

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

  // Auto-fit CHỈ chạy khi người dùng chủ động bấm — khác Effect 2 (tự fit khi đổi bộ dữ liệu nến),
  // dùng sau khi zoom/pan để đưa toàn bộ dữ liệu đang có trở lại vào khung nhìn.
  function handleAutoFit() {
    chartRef.current?.timeScale().fitContent();
  }

  const legend = legendAt(candles, hoveredIndex ?? candles.length - 1);
  const legendColorClass =
    legend?.direction === 'up'
      ? 'text-success'
      : legend?.direction === 'down'
        ? 'text-danger'
        : 'text-muted-foreground';

  return (
    <div className="relative min-w-0">
      <div
        ref={containerRef}
        className="h-[560px] w-full min-w-0"
        role="group"
        aria-label={`Chart nến ${label} với Multi-MA và Multi-RSI`}
      />
      <button
        type="button"
        onClick={handleAutoFit}
        aria-label="Đưa toàn bộ dữ liệu vào khung nhìn (auto fit)"
        className="text-foreground bg-surface/70 hover:bg-surface border-border absolute top-2 right-2 z-10 min-h-11 min-w-11 rounded-md border px-2 py-1 text-xs font-medium"
      >
        Auto fit
      </button>
      {legend && (
        <div
          aria-label={`Chú giải OHLC ${label}`}
          className="text-foreground bg-surface/70 pointer-events-none absolute top-2 left-2 z-10 flex flex-wrap gap-x-3 rounded px-2 py-1 font-mono text-xs"
        >
          <span>
            O <span className={legendColorClass}>{formatLegendPrice(legend.open)}</span>
          </span>
          <span>
            H <span className={legendColorClass}>{formatLegendPrice(legend.high)}</span>
          </span>
          <span>
            L <span className={legendColorClass}>{formatLegendPrice(legend.low)}</span>
          </span>
          <span>
            C <span className={legendColorClass}>{formatLegendPrice(legend.close)}</span>
          </span>
          <span className={legendColorClass}>{formatLegendChange(legend)}</span>
        </div>
      )}
    </div>
  );
}
