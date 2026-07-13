import type { Candle } from '@/lib/candles/types';

/** Điểm mây Ichimoku (Senkou Span A/B) — CHƯA dịch (`displacement` áp dụng lúc so sánh/vẽ, xem
 * `cloudAt`). `null` ở vùng "khởi động" (chưa đủ dữ liệu cho chu kỳ đó). */
export interface IchimokuPoint {
  ts: string;
  spanA: number | null;
  spanB: number | null;
}

/** Trung bình (cao nhất + thấp nhất) trong `period` nến gần nhất tính đến `index` — nền của
 * Conversion/Base/Span B Line. `null` nếu chưa đủ dữ liệu. */
function donchian(candles: readonly Candle[], index: number, period: number): number | null {
  if (index < period - 1) return null;
  let highest = -Infinity;
  let lowest = Infinity;
  for (let j = index - period + 1; j <= index; j++) {
    const c = candles[j];
    if (!c) return null;
    if (c.high > highest) highest = c.high;
    if (c.low < lowest) lowest = c.low;
  }
  return (highest + lowest) / 2;
}

/**
 * Ichimoku Kumo (chỉ mây — không tính Conversion/Base/Chikou riêng lẻ, theo đúng đặc tả chỉ báo
 * gốc): spanA = avg(donchian(conversionPeriod), donchian(basePeriod)); spanB =
 * donchian(spanBPeriod). Khớp công thức chuẩn TradingView.
 */
export function ichimokuCloud(
  candles: readonly Candle[],
  conversionPeriod = 9,
  basePeriod = 26,
  spanBPeriod = 52,
): IchimokuPoint[] {
  if (conversionPeriod <= 0 || basePeriod <= 0 || spanBPeriod <= 0) {
    throw new Error('period phải > 0');
  }

  const result: IchimokuPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;
    const conv = donchian(candles, i, conversionPeriod);
    const base = donchian(candles, i, basePeriod);
    result.push({
      ts: candle.ts,
      spanA: conv !== null && base !== null ? (conv + base) / 2 : null,
      spanB: donchian(candles, i, spanBPeriod),
    });
  }
  return result;
}

/** Biên mây tại nến `index` sau khi dịch. */
export interface CloudBounds {
  top: number;
  bot: number;
  /** true = mây xanh (SpanA ≥ SpanB, bullish), false = mây đỏ. */
  green: boolean;
}

/**
 * Mây đang "trùm" lên nến `index` — Ichimoku vẽ SpanA/SpanB dịch tới trước `displacement` nến, nên
 * mây tại nến `index` chính là SpanA/SpanB đã tính ở nến `index - displacement`. `null` nếu ngoài
 * phạm vi hoặc chưa đủ dữ liệu.
 */
export function cloudAt(
  points: readonly IchimokuPoint[],
  index: number,
  displacement: number,
): CloudBounds | null {
  const source = points[index - displacement];
  if (!source || source.spanA === null || source.spanB === null) return null;
  return {
    top: Math.max(source.spanA, source.spanB),
    bot: Math.min(source.spanA, source.spanB),
    green: source.spanA >= source.spanB,
  };
}
