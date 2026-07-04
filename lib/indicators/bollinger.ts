import type { Candle } from '@/lib/candles/types';
import { sma } from '@/lib/indicators/sma';

/** Điểm Bollinger Bands — `null` ở vùng "khởi động" (chưa đủ dữ liệu cho chu kỳ). */
export interface BollingerPoint {
  ts: string;
  basis: number | null;
  upper: number | null;
  lower: number | null;
}

/**
 * Bollinger Bands theo quy ước TradingView: basis = SMA(period) trên giá đóng cửa; upper/lower =
 * basis ± multiplier × độ lệch chuẩn **population** (chia cho `period`, không phải `period - 1`).
 * Giá đứng yên → σ = 0 → ba băng trùng nhau (không lỗi chia).
 */
export function bollinger(
  candles: readonly Candle[],
  period = 20,
  multiplier = 2,
): BollingerPoint[] {
  if (period <= 0) throw new Error('period phải > 0');
  if (multiplier <= 0) throw new Error('multiplier phải > 0');

  const basisPoints = sma(candles, period);
  const result: BollingerPoint[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const basisPoint = basisPoints[i];
    if (!candle || !basisPoint) continue;

    const basis = basisPoint.value;
    if (basis === null) {
      result.push({ ts: candle.ts, basis: null, upper: null, lower: null });
      continue;
    }

    let sumSquares = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const c = candles[j];
      if (c) sumSquares += (c.close - basis) ** 2;
    }
    const stdDev = Math.sqrt(sumSquares / period);

    result.push({
      ts: candle.ts,
      basis,
      upper: basis + multiplier * stdDev,
      lower: basis - multiplier * stdDev,
    });
  }

  return result;
}
