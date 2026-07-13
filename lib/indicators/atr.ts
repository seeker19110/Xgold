import type { Candle } from '@/lib/candles/types';
import type { IndicatorPoint } from '@/lib/indicators/types';

/** True Range: nến đầu tiên (không có close trước đó) chỉ dùng high-low. */
function trueRange(curr: Candle, prevClose: number | undefined): number {
  if (prevClose === undefined) return curr.high - curr.low;
  return Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prevClose),
    Math.abs(curr.low - prevClose),
  );
}

/**
 * ATR (Wilder smoothing / RMA trên True Range) — khớp cách TradingView tính. Giá trị đầu tiên ở
 * index `period - 1` (trung bình cộng đơn giản của `period` True Range đầu), sau đó làm mượt kiểu
 * Wilder (cùng công thức RMA với `rsi.ts`).
 */
export function atr(candles: readonly Candle[], period = 14): IndicatorPoint[] {
  if (period <= 0) throw new Error('period phải > 0');

  const result: IndicatorPoint[] = [];
  let sum = 0;
  let prevAtr: number | undefined;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;
    const tr = trueRange(candle, candles[i - 1]?.close);

    if (i < period - 1) {
      sum += tr;
      result.push({ ts: candle.ts, value: null });
      continue;
    }
    if (i === period - 1) {
      sum += tr;
      prevAtr = sum / period;
      result.push({ ts: candle.ts, value: prevAtr });
      continue;
    }
    if (prevAtr === undefined) {
      // Không thể xảy ra (nhánh i === period - 1 luôn chạy trước) — an toàn kiểu, như ema.ts.
      result.push({ ts: candle.ts, value: null });
      continue;
    }

    prevAtr = (prevAtr * (period - 1) + tr) / period;
    result.push({ ts: candle.ts, value: prevAtr });
  }

  return result;
}
