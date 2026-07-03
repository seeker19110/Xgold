import { describe, expect, it } from 'vitest';
import { ema } from '@/lib/indicators/ema';
import type { Candle } from '@/lib/candles/types';

function candlesFromCloses(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    ts: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    open: close,
    high: close,
    low: close,
    close,
    volume: null,
  }));
}

describe('ema', () => {
  it('EMA(3) trên chuỗi tuyến tính [1,2,3,4,5] — tính tay: [null,null,2,3,4]', () => {
    // Với chuỗi tuyến tính, độ trễ (lag) của EMA seed-bằng-SMA cùng period trùng với lag của SMA
    // cùng period ((period-1)/2 cho cả hai) — nên hai kết quả trùng nhau ở đây, không phải trùng hợp.
    const candles = candlesFromCloses([1, 2, 3, 4, 5]);
    const result = ema(candles, 3);
    expect(result.map((p) => p.value)).toEqual([null, null, 2, 3, 4]);
  });

  it('EMA(2) trên [10,20,10,20,10] — tính tay bằng phân số: 15, 35/3, 155/9, 335/27', () => {
    const candles = candlesFromCloses([10, 20, 10, 20, 10]);
    const result = ema(candles, 2);
    const values = result.map((p) => p.value);

    expect(values[0]).toBeNull();
    expect(values[1]).toBeCloseTo(15, 6);
    expect(values[2]).toBeCloseTo(35 / 3, 6);
    expect(values[3]).toBeCloseTo(155 / 9, 6);
    expect(values[4]).toBeCloseTo(335 / 27, 6);
  });

  it('mảng ngắn hơn period → toàn null', () => {
    const candles = candlesFromCloses([1, 2]);
    const result = ema(candles, 5);
    expect(result.map((p) => p.value)).toEqual([null, null]);
  });

  it('ném lỗi khi period <= 0', () => {
    expect(() => ema(candlesFromCloses([1, 2]), 0)).toThrow();
  });
});
