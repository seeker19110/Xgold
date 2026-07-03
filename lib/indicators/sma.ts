import type { Candle } from '@/lib/candles/types';
import type { IndicatorPoint } from '@/lib/indicators/types';

/** Trung bình trượt đơn giản trên giá đóng cửa. Giá trị đầu tiên ở index `period - 1`. */
export function sma(candles: readonly Candle[], period: number): IndicatorPoint[] {
  if (period <= 0) throw new Error('period phải > 0');

  const result: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;

    sum += candle.close;
    const old = i >= period ? candles[i - period] : undefined;
    if (old) sum -= old.close;

    result.push({ ts: candle.ts, value: i >= period - 1 ? sum / period : null });
  }

  return result;
}
