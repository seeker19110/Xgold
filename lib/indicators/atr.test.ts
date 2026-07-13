import { describe, expect, it } from 'vitest';
import { atr } from '@/lib/indicators/atr';
import type { Candle } from '@/lib/candles/types';

function candle(ts: number, open: number, high: number, low: number, close: number): Candle {
  return {
    ts: new Date(Date.UTC(2026, 0, ts)).toISOString(),
    open,
    high,
    low,
    close,
    volume: null,
  };
}

describe('atr', () => {
  it('ATR(3) tính tay: TR=[2,2,2,4] → seed avg(2,2,2)=2, rồi Wilder (2*2+4)/3=8/3', () => {
    const candles: Candle[] = [
      candle(1, 9, 10, 8, 9),
      candle(2, 9, 11, 9, 10),
      candle(3, 10, 12, 10, 11),
      candle(4, 11, 9, 7, 8),
    ];
    const result = atr(candles, 3);
    expect(result.map((p) => p.value)).toEqual([null, null, 2, 8 / 3]);
  });

  it('period <= 0 ném lỗi', () => {
    expect(() => atr([], 0)).toThrow('period phải > 0');
  });

  it('mảng ngắn hơn period → toàn null', () => {
    const candles: Candle[] = [candle(1, 9, 10, 8, 9), candle(2, 9, 11, 9, 10)];
    expect(atr(candles, 3).map((p) => p.value)).toEqual([null, null]);
  });
});
