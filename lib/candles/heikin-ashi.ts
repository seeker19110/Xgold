import type { Candle } from '@/lib/candles/types';

/**
 * Chuyển dãy nến gốc sang nến Heikin Ashi (công thức chuẩn, khớp TradingView).
 * Chỉ OHLC đổi — `ts` và `volume` giữ nguyên từ nến gốc. Input rỗng → trả `[]` (không throw).
 *
 * haClose[i] = (open[i] + high[i] + low[i] + close[i]) / 4
 * haOpen[0]  = (open[0] + close[0]) / 2
 * haOpen[i]  = (haOpen[i-1] + haClose[i-1]) / 2   (i > 0, đệ quy trên giá trị HA đã tính, không phải giá gốc)
 * haHigh[i]  = max(high[i], haOpen[i], haClose[i])
 * haLow[i]   = min(low[i], haOpen[i], haClose[i])
 */
export function toHeikinAshi(candles: readonly Candle[]): Candle[] {
  const result: Candle[] = [];
  let prevHaOpen = 0;
  let prevHaClose = 0;

  candles.forEach((candle, index) => {
    const { ts, open, high, low, close, volume } = candle;

    const haClose = (open + high + low + close) / 4;
    const haOpen = index === 0 ? (open + close) / 2 : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(high, haOpen, haClose);
    const haLow = Math.min(low, haOpen, haClose);

    result.push({ ts, open: haOpen, high: haHigh, low: haLow, close: haClose, volume });

    prevHaOpen = haOpen;
    prevHaClose = haClose;
  });

  return result;
}
