import type { Candle } from '@/lib/candles/types';
import type { IndicatorPoint } from '@/lib/indicators/types';

/**
 * Trung bình trượt lũy thừa trên giá đóng cửa. Seed bằng SMA của `period` phần tử đầu (khớp cách
 * TradingView tính) rồi cập nhật đệ quy — giá trị đầu tiên ở index `period - 1`.
 */
export function ema(candles: readonly Candle[], period: number): IndicatorPoint[] {
  if (period <= 0) throw new Error('period phải > 0');

  const k = 2 / (period + 1);
  const result: IndicatorPoint[] = [];
  let sum = 0;
  let prevEma: number | undefined;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;

    if (i < period - 1) {
      sum += candle.close;
      result.push({ ts: candle.ts, value: null });
      continue;
    }
    if (i === period - 1) {
      sum += candle.close;
      prevEma = sum / period;
      result.push({ ts: candle.ts, value: prevEma });
      continue;
    }
    if (prevEma === undefined) {
      // Không thể xảy ra (nhánh i === period - 1 luôn chạy trước, vòng lặp tăng dần) — an toàn kiểu.
      result.push({ ts: candle.ts, value: null });
      continue;
    }

    prevEma = candle.close * k + prevEma * (1 - k);
    result.push({ ts: candle.ts, value: prevEma });
  }

  return result;
}
