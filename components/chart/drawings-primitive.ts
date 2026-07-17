import type {
  IChartApiBase,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';
import type { Drawing } from '@/lib/drawings/types';
import { FIB_LEVELS, fibLevelPrice } from '@/lib/drawings/fibonacci';
import {
  HIT_TOLERANCE_PX,
  distancePointToHorizontal,
  distancePointToSegment,
} from '@/lib/drawings/geometry';
import {
  FIB_LINE_COLOR,
  HANDLE_SIZE,
  LINE_WIDTH,
  SELECTED_COLOR,
  SELECTED_LINE_WIDTH,
} from '@/lib/drawings/style';

/** Màu "khung" theo theme (nền + chữ) để vẽ nhãn % Fibonacci đọc được ở cả Dark blue/Light. */
export interface DrawingThemeChrome {
  foreground: string;
  background: string;
}

/**
 * Series Primitive (API chính thức lightweight-charts v5 — `ISeriesPrimitive`, gắn qua
 * `series.attachPrimitive`) vẽ 3 loại công cụ: đường ngang, trendline, Fibonacci retracement.
 *
 * Nguyên tắc sống-sót-zoom/pan (ADR-0012): KHÔNG lưu pixel. Mỗi lần chart vẽ lại (zoom/pan/đổi
 * timeframe), renderer quy đổi lại `time`+`price` → pixel bằng `series.priceToCoordinate` và
 * `timeScale().timeToCoordinate` NGAY tại thời điểm vẽ, nên nét luôn bám đúng dữ liệu giá.
 *
 * Vẽ trong không gian toạ độ MEDIA (CSS px) — trùng đơn vị mà hai hàm quy đổi trên trả về, tránh tự
 * nhân tỉ lệ pixel (đơn giản + đúng; nét có thể bớt sắc trên màn HiDPI nhưng không lệch vị trí).
 */
export class DrawingsPrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApiBase<Time> | null = null;
  private _series: ISeriesApi<SeriesType> | null = null;
  private _requestUpdate: (() => void) | null = null;
  private _drawings: readonly Drawing[] = [];
  private _selectedId: string | null = null;
  private _theme: DrawingThemeChrome;
  private readonly _paneView: IPrimitivePaneView;

  constructor(theme: DrawingThemeChrome) {
    this._theme = theme;
    // Object literal → param `target` được suy kiểu theo IPrimitivePaneRenderer (không cần import
    // CanvasRenderingTarget2D từ 'fancy-canvas', vốn chỉ là dep gián tiếp).
    this._paneView = { renderer: (): IPrimitivePaneRenderer => this._buildRenderer() };
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  /** Cập nhật danh sách nét vẽ hiện tại (từ state React) rồi yêu cầu chart vẽ lại. */
  setDrawings(drawings: readonly Drawing[]): void {
    this._drawings = drawings;
    this._requestUpdate?.();
  }

  /** Đặt nét đang được chọn (highlight) — `null` để bỏ chọn. */
  setSelected(id: string | null): void {
    this._selectedId = id;
    this._requestUpdate?.();
  }

  /** Cập nhật màu theme (gọi khi đổi Dark blue ↔ Light) để nhãn % luôn tương phản đúng. */
  setTheme(theme: DrawingThemeChrome): void {
    this._theme = theme;
    this._requestUpdate?.();
  }

  /**
   * Trả về id nét vẽ nằm trong ngưỡng `HIT_TOLERANCE_PX` quanh (x, y) — chọn nét GẦN NHẤT nếu có
   * nhiều. Quy đổi time/price của từng nét sang pixel tại thời điểm gọi (đúng với zoom/pan hiện tại).
   * Trả `null` nếu không trúng nét nào.
   */
  hitTestDrawing(x: number, y: number): string | null {
    const series = this._series;
    const chart = this._chart;
    if (!series || !chart) return null;
    const timeScale = chart.timeScale();

    let bestId: string | null = null;
    let bestDist = HIT_TOLERANCE_PX;

    for (const drawing of this._drawings) {
      const dist = this._distanceTo(drawing, x, y, series, timeScale);
      if (dist !== null && dist <= bestDist) {
        bestDist = dist;
        bestId = drawing.id;
      }
    }
    return bestId;
  }

  private _distanceTo(
    drawing: Drawing,
    x: number,
    y: number,
    series: ISeriesApi<SeriesType>,
    timeScale: ReturnType<IChartApiBase<Time>['timeScale']>,
  ): number | null {
    switch (drawing.type) {
      case 'horizontal-line': {
        const lineY = series.priceToCoordinate(drawing.price);
        return lineY === null ? null : distancePointToHorizontal(y, lineY);
      }
      case 'trendline': {
        const x1 = timeScale.timeToCoordinate(drawing.p1.time as Time);
        const x2 = timeScale.timeToCoordinate(drawing.p2.time as Time);
        const y1 = series.priceToCoordinate(drawing.p1.price);
        const y2 = series.priceToCoordinate(drawing.p2.price);
        if (x1 === null || x2 === null || y1 === null || y2 === null) return null;
        return distancePointToSegment(x, y, x1, y1, x2, y2);
      }
      case 'fib-retracement': {
        // Trúng nếu gần BẤT KỲ mức nào — lấy khoảng cách dọc nhỏ nhất tới các đường mức.
        let min: number | null = null;
        for (const level of FIB_LEVELS) {
          const price = fibLevelPrice(drawing.p1.price, drawing.p2.price, level);
          const lineY = series.priceToCoordinate(price);
          if (lineY === null) continue;
          const dist = distancePointToHorizontal(y, lineY);
          if (min === null || dist < min) min = dist;
        }
        return min;
      }
    }
  }

  private _buildRenderer(): IPrimitivePaneRenderer {
    const chart = this._chart;
    const series = this._series;
    const drawings = this._drawings;
    const selectedId = this._selectedId;
    const theme = this._theme;

    return {
      draw: (target) => {
        if (!chart || !series) return;
        const timeScale = chart.timeScale();
        target.useMediaCoordinateSpace((scope) => {
          const ctx = scope.context;
          const width = scope.mediaSize.width;
          for (const drawing of drawings) {
            const selected = drawing.id === selectedId;
            switch (drawing.type) {
              case 'horizontal-line':
                drawHorizontalLine(ctx, width, drawing.price, drawing.color, selected, series);
                break;
              case 'trendline':
                drawTrendline(ctx, drawing, selected, series, timeScale);
                break;
              case 'fib-retracement':
                drawFib(ctx, width, drawing, selected, series, theme);
                break;
            }
          }
        });
      },
    };
  }
}

type Ctx = CanvasRenderingContext2D;
type PriceSeries = ISeriesApi<SeriesType>;
type TimeScale = ReturnType<IChartApiBase<Time>['timeScale']>;

function strokeStyle(color: string, selected: boolean): { color: string; width: number } {
  return {
    color: selected ? SELECTED_COLOR : color,
    width: selected ? SELECTED_LINE_WIDTH : LINE_WIDTH,
  };
}

function drawHorizontalLine(
  ctx: Ctx,
  width: number,
  price: number,
  color: string,
  selected: boolean,
  series: PriceSeries,
): void {
  const y = series.priceToCoordinate(price);
  if (y === null) return;
  const style = strokeStyle(color, selected);
  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.restore();
}

function drawTrendline(
  ctx: Ctx,
  drawing: Extract<Drawing, { type: 'trendline' }>,
  selected: boolean,
  series: PriceSeries,
  timeScale: TimeScale,
): void {
  const x1 = timeScale.timeToCoordinate(drawing.p1.time as Time);
  const x2 = timeScale.timeToCoordinate(drawing.p2.time as Time);
  const y1 = series.priceToCoordinate(drawing.p1.price);
  const y2 = series.priceToCoordinate(drawing.p2.price);
  if (x1 === null || x2 === null || y1 === null || y2 === null) return;

  const style = strokeStyle(drawing.color, selected);
  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  if (selected) {
    ctx.fillStyle = SELECTED_COLOR;
    for (const [hx, hy] of [
      [x1, y1],
      [x2, y2],
    ] as const) {
      ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }
  }
  ctx.restore();
}

function drawFib(
  ctx: Ctx,
  width: number,
  drawing: Extract<Drawing, { type: 'fib-retracement' }>,
  selected: boolean,
  series: PriceSeries,
  theme: DrawingThemeChrome,
): void {
  const style = strokeStyle(FIB_LINE_COLOR, selected);
  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.font = '11px sans-serif';
  ctx.textBaseline = 'middle';

  for (const level of FIB_LEVELS) {
    const price = fibLevelPrice(drawing.p1.price, drawing.p2.price, level);
    const y = series.priceToCoordinate(price);
    if (y === null) continue;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // Nhãn % cạnh mép trái: chip nền theme + chữ theme → luôn đạt tương phản AA (theo thiết kế token).
    const label = `${(level * 100).toFixed(1)}%`;
    const paddingX = 4;
    const textWidth = ctx.measureText(label).width;
    const chipW = textWidth + paddingX * 2;
    const chipH = 14;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = theme.background;
    ctx.fillRect(2, y - chipH / 2, chipW, chipH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.foreground;
    ctx.fillText(label, 2 + paddingX, y);
  }
  ctx.restore();
}
