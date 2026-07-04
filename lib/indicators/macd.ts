import type { Candle } from '@/lib/candles/types';
import { ema } from '@/lib/indicators/ema';

/** Điểm MACD — mỗi thành phần `null` ở vùng "khởi động" riêng của nó (chưa đủ dữ liệu). */
export interface MacdPoint {
  ts: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

/**
 * MACD theo quy ước TradingView: MACD line = EMA(fast) − EMA(slow); Signal = EMA(signalPeriod)
 * của MACD line (seed bằng SMA của `signalPeriod` giá trị MACD đầu tiên — cùng cách seed với
 * `ema.ts`); Histogram = MACD − Signal. MACD line có giá trị đầu ở index `slow - 1`, Signal ở
 * index `slow - 1 + signalPeriod - 1`.
 */
export function macd(
  candles: readonly Candle[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdPoint[] {
  if (fast <= 0 || slow <= 0 || signalPeriod <= 0) throw new Error('period phải > 0');
  if (fast >= slow) throw new Error('fast phải nhỏ hơn slow');

  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);

  const result: MacdPoint[] = [];
  const k = 2 / (signalPeriod + 1);
  let seedSum = 0;
  let seedCount = 0;
  let prevSignal: number | undefined;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const f = fastEma[i];
    const s = slowEma[i];
    if (!candle || !f || !s) continue;

    const macdValue = f.value !== null && s.value !== null ? f.value - s.value : null;

    let signalValue: number | null = null;
    if (macdValue !== null) {
      if (prevSignal !== undefined) {
        prevSignal = macdValue * k + prevSignal * (1 - k);
        signalValue = prevSignal;
      } else {
        seedSum += macdValue;
        seedCount += 1;
        if (seedCount === signalPeriod) {
          prevSignal = seedSum / signalPeriod;
          signalValue = prevSignal;
        }
      }
    }

    result.push({
      ts: candle.ts,
      macd: macdValue,
      signal: signalValue,
      histogram: macdValue !== null && signalValue !== null ? macdValue - signalValue : null,
    });
  }

  return result;
}
