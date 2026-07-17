'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, Timeframe } from '@/lib/candles/types';
import { toHeikinAshi } from '@/lib/candles/heikin-ashi';
import {
  candleCountdown,
  formatLegendChange,
  formatLegendPrice,
  legendAt,
} from '@/lib/candles/legend';
import type { ChartConfig, ChartType } from '@/lib/indicators/config';
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
  /** Khung thời gian đang hiển thị — dùng tính countdown nến hiện tại trong legend. */
  timeframe: Timeframe;
  /**
   * true khi container cha (chart-page-client.tsx) đang ở chế độ fullscreen (W-505) — container
   * chart giãn hết chiều cao khả dụng (flex-1/h-full) thay vì chiều cao cố định 560px.
   */
  fullscreenActive?: boolean;
  /**
   * Gọi với chart instance ngay khi tạo xong (Effect 1) và với `null` lúc dọn dẹp/unmount — dùng để
   * chụp ảnh chart (`chart.takeScreenshot()`, W-505) từ component cha.
   */
  onChartReady?: (chart: IChartApi | null) => void;
  /**
   * Chuỗi % của MÃ SO SÁNH đã chuẩn hoá bằng `normalizeToPercent` (W-506/W-507) trên toàn bộ khung
   * nhìn hiện có. Rỗng/undefined = không so sánh (đường bị gỡ). Vẽ trên thang giá riêng `'compare'`
   * để KHÔNG làm méo thang giá nến chính (nến vẫn hiển thị giá thật).
   */
  compareData?: readonly { ts: string; value: number }[];
  /** Nhãn mã so sánh (vd 'XAG/USD') cho chú giải % — chỉ hiển thị khi có `compareData`. */
  compareLabel?: string;
}

interface ThemeColors {
  background: string;
  foreground: string;
  border: string;
  primary: string;
  success: string;
  danger: string;
}

const RSI_PANE_INDEX = 1;

/** Kiểu chart (config) → loại series lightweight-charts. Heikin Ashi dùng lại series nến. */
const CHART_TYPE_TO_SERIES: Record<ChartType, SeriesType> = {
  candles: 'Candlestick',
  heikinAshi: 'Candlestick',
  bar: 'Bar',
  line: 'Line',
  area: 'Area',
};

// Line/Area chỉ có 1 giá trị/nến (close) — không phải OHLC.
function isValueSeries(seriesType: SeriesType): boolean {
  return seriesType === 'Line' || seriesType === 'Area';
}

// Màu vùng tô Area (dưới đường) — cố định, dịu, đọc được trên cả Dark blue lẫn Light
// (đường Area lấy màu theo `--primary` của theme, xem createMainSeries/applyMainSeriesColors).
const AREA_TOP_COLOR = 'rgba(91, 157, 255, 0.4)';
const AREA_BOTTOM_COLOR = 'rgba(91, 157, 255, 0)';

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
// Màu cố định đường so sánh mã (W-507) — tím, tách biệt rõ với nến (success/danger) và các overlay
// khác (BB xám, MACD xanh/cam, Ichimoku vàng/đỏ); tương phản đủ trên cả Dark blue lẫn Light.
const COMPARE_COLOR = '#c084fc';
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
    primary: get('--primary', '#5b9dff'),
    success: get('--success', '#4ade80'),
    danger: get('--danger', '#f87171'),
  };
}

/** Tạo series chính đúng loại theo kiểu chart, áp màu theme lúc khởi tạo. */
function createMainSeries(
  chart: IChartApi,
  chartType: ChartType,
  colors: ThemeColors,
): ISeriesApi<SeriesType> {
  switch (chartType) {
    case 'bar':
      return chart.addSeries(BarSeries, {
        upColor: colors.success,
        downColor: colors.danger,
      });
    case 'line':
      return chart.addSeries(LineSeries, {
        color: colors.primary,
        lineWidth: 2,
        priceLineVisible: false,
      });
    case 'area':
      return chart.addSeries(AreaSeries, {
        lineColor: colors.primary,
        topColor: AREA_TOP_COLOR,
        bottomColor: AREA_BOTTOM_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
      });
    case 'candles':
    case 'heikinAshi':
      return chart.addSeries(CandlestickSeries, {
        upColor: colors.success,
        downColor: colors.danger,
        borderVisible: false,
        wickUpColor: colors.success,
        wickDownColor: colors.danger,
      });
  }
}

/** Áp lại màu theme cho series chính đang hiển thị (gọi khi đổi theme Dark blue ↔ Light). */
function applyMainSeriesColors(
  series: ISeriesApi<SeriesType>,
  seriesType: SeriesType,
  colors: ThemeColors,
): void {
  switch (seriesType) {
    case 'Bar':
      series.applyOptions({ upColor: colors.success, downColor: colors.danger });
      break;
    case 'Line':
      series.applyOptions({ color: colors.primary });
      break;
    case 'Area':
      series.applyOptions({ lineColor: colors.primary });
      break;
    default:
      // Candlestick (candles + heikinAshi)
      series.applyOptions({
        upColor: colors.success,
        downColor: colors.danger,
        wickUpColor: colors.success,
        wickDownColor: colors.danger,
      });
  }
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
/** Định dạng % có dấu cho chú giải mã so sánh (vd +1.23% / -0.80%). */
function formatComparePercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function GoldChart({
  candles,
  config,
  label,
  timeframe,
  fullscreenActive,
  onChartReady,
  compareData,
  compareLabel,
}: GoldChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Ref giữ callback mới nhất — tránh Effect 1 (chỉ chạy 1 lần lúc mount) phải liệt kê
  // `onChartReady` vào deps (component cha có thể truyền hàm mới mỗi lần render).
  const onChartReadyRef = useRef(onChartReady);
  useEffect(() => {
    onChartReadyRef.current = onChartReady;
  }, [onChartReady]);
  // Series chính đa kiểu (Nến/HA/Bar/Line/Area, W-502) — dùng union `SeriesType` vì lightweight
  // -charts không cho đổi loại series tại chỗ: đổi kiểu = remove series cũ + add series mới.
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  // Loại series đang gắn — để theme observer biết cách áp màu (nến/bar khác line/area).
  const mainSeriesTypeRef = useRef<SeriesType>('Candlestick');
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
  const compareSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Tra chỉ số nến theo mốc thời gian cho crosshair → legend OHLC (cập nhật ở Effect 2).
  const timeToIndexRef = useRef<Map<number, number>>(new Map());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Mốc giờ hiện tại cho countdown nến (legend) — tick mỗi giây, KHÔNG đọc Date.now() trực tiếp
  // trong render (tránh lệch giữa các lần render và không tất định khi test).
  const [now, setNow] = useState<Date>(() => new Date());
  const ichimokuSeriesRef = useRef<{
    spanA: ISeriesApi<'Line'> | null;
    spanB: ISeriesApi<'Line'> | null;
  }>({ spanA: null, spanB: null });

  // Effect 1: dựng chart một lần (series chính do Effect 1a quản lý vòng đời); dọn khi unmount.
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

    chartRef.current = chart;
    onChartReadyRef.current?.(chart);

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
      // Series chính có thể đã đổi loại (W-502) — áp màu theo loại hiện tại qua ref.
      if (mainSeriesRef.current) {
        applyMainSeriesColors(mainSeriesRef.current, mainSeriesTypeRef.current, next);
      }
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
      onChartReadyRef.current?.(null);
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      compareSeriesRef.current = null;
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

  // Effect 1a: vòng đời SERIES CHÍNH theo kiểu chart (W-502). lightweight-charts không cho đổi loại
  // series tại chỗ nên đổi kiểu = remove series cũ (kéo theo hủy markers plugin gắn trên nó) + add
  // series loại mới. Chạy TRƯỚC Effect 2/2a/7 (thứ tự khai báo) — cả 3 effect đó cũng phụ thuộc
  // config.chartType nên sẽ set lại data/thang giá/markers lên series MỚI ngay trong cùng lượt render.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
      // markers plugin bị hủy cùng series cũ — buộc Effect 7 tạo lại trên series mới.
      markersRef.current = null;
    }

    const colors = readThemeColors();
    mainSeriesRef.current = createMainSeries(chart, config.chartType, colors);
    mainSeriesTypeRef.current = CHART_TYPE_TO_SERIES[config.chartType];
  }, [config.chartType]);

  // Effect 1b: tick countdown nến (legend) mỗi giây — dọn dẹp interval khi unmount/đổi symbol.
  // (interval được clearInterval trong cleanup của chính effect này khi deps đổi; gold-chart KHÔNG
  // được remount theo `key` — chart-page-client render <GoldChart> không truyền prop `key`.)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Effect 2: dữ liệu series chính + map thời gian→chỉ số cho legend (đổi dữ liệu thì bỏ hover cũ).
  // Phụ thuộc cả config.chartType: đổi kiểu chart thì Effect 1a đã tạo series mới, ở đây set lại data
  // đúng dạng (OHLC cho nến/HA/bar; close cho line/area). Heikin Ashi lấy OHLC đã làm mượt; line/area
  // luôn theo GIÁ GỐC (close). Chỉ số legend luôn theo mảng `candles` gốc (HA giữ nguyên ts/độ dài).
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series) return;

    const seriesType = CHART_TYPE_TO_SERIES[config.chartType];
    const ohlcCandles = config.chartType === 'heikinAshi' ? toHeikinAshi(candles) : candles;

    const timeToIndex = new Map<number, number>();
    candles.forEach((c, i) => timeToIndex.set(toUtcTimestamp(c.ts), i));

    if (isValueSeries(seriesType)) {
      // Line/Area: giá gốc (không dùng HA close ở v1).
      series.setData(candles.map((c) => ({ time: toUtcTimestamp(c.ts), value: c.close })));
    } else {
      series.setData(
        ohlcCandles.map((c) => ({
          time: toUtcTimestamp(c.ts),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
    }
    timeToIndexRef.current = timeToIndex;
    // Nến cũ không còn — index hover cũ trỏ nhầm nến mới; đặt lại về "nến mới nhất".
    setHoveredIndex(null);
    chartRef.current?.timeScale().fitContent();
  }, [candles, config.chartType]);

  // Effect 2a: thang giá Log/Linear (W-503) — áp lên price scale phải (thang giá nến), tách khỏi
  // thang giá 'volume' riêng (Effect 2b) để không kéo méo cột khối lượng khi bật log.
  // Phụ thuộc cả config.chartType để áp lại mode lên series MỚI sau khi đổi kiểu chart (W-502).
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series) return;
    series.priceScale().applyOptions({
      mode:
        config.priceScaleMode === 'logarithmic'
          ? PriceScaleMode.Logarithmic
          : PriceScaleMode.Normal,
    });
  }, [config.priceScaleMode, config.chartType]);

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

  // Effect so sánh mã (W-507): 1 đường % của mã phụ chồng lên pane giá (0), THANG GIÁ RIÊNG
  // 'compare' (overlay như 'volume' — không hiển thị trục, không kéo méo thang giá nến chính giữ
  // giá thật). Không có `compareData` → gỡ series (removeSeries) để không rò rỉ khi bỏ chọn/đổi mã.
  // Dữ liệu % đã được component cha chuẩn hoá sẵn bằng `normalizeToPercent`; ở đây chỉ đổi ts→time.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!compareData || compareData.length === 0) {
      if (compareSeriesRef.current) {
        chart.removeSeries(compareSeriesRef.current);
        compareSeriesRef.current = null;
      }
      return;
    }

    if (!compareSeriesRef.current) {
      const series = chart.addSeries(LineSeries, {
        color: COMPARE_COLOR,
        lineWidth: 2,
        priceScaleId: 'compare',
        priceFormat: { type: 'percent' },
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // Chừa lề trên/dưới để đường % không dính sát mép pane (giống scaleMargins của volume).
      series.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      compareSeriesRef.current = series;
    }

    compareSeriesRef.current.setData(
      compareData.map((p) => ({ time: toUtcTimestamp(p.ts), value: p.value })),
    );
  }, [compareData]);

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
  // phân tích (lib/analysis) chuyển sang Mua/Bán. Tắt phân tích → xóa markers. Phụ thuộc cả
  // config.chartType: đổi kiểu chart hủy markers plugin cũ (Effect 1a set markersRef=null) nên phải
  // tạo lại plugin trên series mới rồi set lại markers (vị trí theo thời gian, đúng với mọi kiểu).
  useEffect(() => {
    const series = mainSeriesRef.current;
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
  }, [candles, config.analysis, config.chartType]);

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
  // Countdown luôn tính trên nến MỚI NHẤT (đang mở) — không phụ thuộc nến đang hover, vì countdown
  // trả lời "khi nào nến hiện tại đóng lại", không phải nến dưới con trỏ.
  const latestCandle = candles[candles.length - 1];
  const countdown = latestCandle ? candleCountdown(timeframe, latestCandle.ts, now) : null;
  // Chú giải mã so sánh: % mới nhất của mã phụ (chỉ khi đang so sánh). Cũng là điểm móc DOM cho E2E
  // xác nhận đường so sánh đã hiện (series vẽ trên canvas nên không truy vấn trực tiếp được).
  const hasCompare = !!compareLabel && !!compareData && compareData.length > 0;
  const compareLatest = hasCompare ? compareData[compareData.length - 1] : undefined;

  return (
    <div className={fullscreenActive ? 'relative min-w-0 flex-1' : 'relative min-w-0'}>
      <div
        ref={containerRef}
        className={fullscreenActive ? 'h-full w-full min-w-0' : 'h-[560px] w-full min-w-0'}
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
      {(legend || (hasCompare && compareLatest)) && (
        // Legend OHLC + badge so sánh cùng nằm trong MỘT container flow (flex-col) thay vì mỗi cái
        // một vị trí `absolute` riêng cố định — legend có thể wrap 2 dòng khi bật nhiều chỉ báo/màn
        // hẹp, badge dưới sẽ tự đẩy xuống theo chiều cao thật của legend thay vì bị chồng lên.
        <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          {legend && (
            <div
              aria-label={`Chú giải OHLC ${label}`}
              className="text-foreground bg-surface/70 flex flex-wrap gap-x-3 rounded px-2 py-1 font-mono text-xs"
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
              {countdown && (
                <span aria-label="Thời gian còn lại tới khi nến hiện tại đóng">
                  ⏱ {countdown.label}
                </span>
              )}
            </div>
          )}
          {hasCompare && compareLatest && (
            <div
              aria-label={`So sánh ${compareLabel}`}
              className="text-foreground bg-surface/70 flex items-center gap-1.5 rounded px-2 py-1 font-mono text-xs"
            >
              {/* Ô màu khớp ĐÚNG màu đường vẽ trên canvas (COMPARE_COLOR) — dùng biến làm nguồn sự
                  thật duy nhất thay vì hard-code lại; đây là swatch chú giải, không phải màu giao
                  diện. */}
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: COMPARE_COLOR }}
              />
              <span>{compareLabel}</span>
              <span>{formatComparePercent(compareLatest.value)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
