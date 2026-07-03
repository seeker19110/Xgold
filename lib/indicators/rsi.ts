import type { Candle } from '@/lib/candles/types';
import type { IndicatorPoint } from '@/lib/indicators/types';

/**
 * Quy đổi trung bình tăng/giảm thành RSI (0-100). Quy ước ca biên:
 * - avgLoss = 0 (toàn tăng hoặc không đổi) → 100.
 * - avgGain = 0 và avgLoss > 0 (toàn giảm) → 0.
 * - avgGain = avgLoss = 0 (giá đứng yên hoàn toàn) → 50 (không tăng không giảm).
 */
function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgGain === 0 && avgLoss === 0) return 50;
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * RSI (Wilder smoothing / RMA — khớp cách TradingView tính, không phải trung bình cộng đơn giản).
 * Giá trị đầu tiên ở index `period` (cần `period` mức thay đổi giá, tức `period + 1` nến).
 * Mảng ngắn hơn hoặc bằng `period` → toàn bộ `null`.
 */
export function rsi(candles: readonly Candle[], period: number): IndicatorPoint[] {
  if (period <= 0) throw new Error('period phải > 0');

  const result: IndicatorPoint[] = [];
  const first = candles[0];
  if (!first) return result;
  result.push({ ts: first.ts, value: null });

  if (candles.length <= period) {
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      if (c) result.push({ ts: c.ts, value: null });
    }
    return result;
  }

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const prevClose = candles[i - 1]?.close;
    const close = candles[i]?.close;
    if (prevClose === undefined || close === undefined) continue;
    const delta = close - prevClose;
    if (delta > 0) gainSum += delta;
    else lossSum += -delta;

    if (i < period) {
      const c = candles[i];
      if (c) result.push({ ts: c.ts, value: null });
    }
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const periodCandle = candles[period];
  if (periodCandle) {
    result.push({ ts: periodCandle.ts, value: rsiFromAverages(avgGain, avgLoss) });
  }

  for (let i = period + 1; i < candles.length; i++) {
    const prevClose = candles[i - 1]?.close;
    const close = candles[i]?.close;
    const c = candles[i];
    if (prevClose === undefined || close === undefined || !c) continue;

    const delta = close - prevClose;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result.push({ ts: c.ts, value: rsiFromAverages(avgGain, avgLoss) });
  }

  return result;
}
