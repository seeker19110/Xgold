import { describe, expect, it } from 'vitest';
import { macd } from '@/lib/indicators/macd';
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

describe('macd', () => {
  it('MACD(2,3,2) trên chuỗi tuyến tính [1..5] — tính tay từng bước', () => {
    // EMA(2) = [null, 1.5, 2.5, 3.5, 4.5]; EMA(3) = [null, null, 2, 3, 4]
    // → MACD line = [null, null, 0.5, 0.5, 0.5] (chuỗi tuyến tính: hai EMA song song, hiệu không đổi)
    // Signal EMA(2) seed SMA 2 giá trị đầu tại i=3: (0.5+0.5)/2 = 0.5; i=4: 0.5·⅔ + 0.5·⅓ = 0.5
    // Histogram = MACD − Signal = 0 từ i=3.
    const result = macd(candlesFromCloses([1, 2, 3, 4, 5]), 2, 3, 2);
    expect(result.map((p) => p.macd)).toEqual([null, null, 0.5, 0.5, 0.5]);
    expect(result.map((p) => p.signal)).toEqual([null, null, null, 0.5, 0.5]);
    expect(result.map((p) => p.histogram)).toEqual([null, null, null, 0, 0]);
  });

  it('MACD(2,3,2) trên [10,20,10,20,10] — phân số chính xác tính tay', () => {
    // EMA(2) = [null, 15, 35/3, 155/9, 335/27] (đã chứng minh ở ema.test.ts)
    // EMA(3), k=1/2: seed i=2 = 40/3; i=3 = 20/2 + (40/3)/2 = 50/3; i=4 = 10/2 + (50/3)/2 = 40/3
    // MACD: i=2 = 35/3 − 40/3 = −5/3; i=3 = 155/9 − 150/9 = 5/9; i=4 = 335/27 − 360/27 = −25/27
    // Signal: seed i=3 = (−5/3 + 5/9)/2 = −5/9; i=4 = (−25/27)·⅔ + (−5/9)·⅓ = −50/81 − 15/81 = −65/81
    // Histogram: i=3 = 5/9 + 5/9 = 10/9; i=4 = −25/27 + 65/81 = −10/81
    const result = macd(candlesFromCloses([10, 20, 10, 20, 10]), 2, 3, 2);
    expect(result[2]?.macd).toBeCloseTo(-5 / 3, 12);
    expect(result[3]?.macd).toBeCloseTo(5 / 9, 12);
    expect(result[4]?.macd).toBeCloseTo(-25 / 27, 12);
    expect(result[3]?.signal).toBeCloseTo(-5 / 9, 12);
    expect(result[4]?.signal).toBeCloseTo(-65 / 81, 12);
    expect(result[3]?.histogram).toBeCloseTo(10 / 9, 12);
    expect(result[4]?.histogram).toBeCloseTo(-10 / 81, 12);
  });

  it('mảng ngắn hơn slow → MACD line toàn null', () => {
    const result = macd(candlesFromCloses([1, 2]), 2, 3, 2);
    expect(result.map((p) => p.macd)).toEqual([null, null]);
    expect(result.map((p) => p.signal)).toEqual([null, null]);
  });

  it('mảng rỗng trả mảng rỗng', () => {
    expect(macd([], 2, 3, 2)).toEqual([]);
  });

  it('ném lỗi khi fast >= slow hoặc period <= 0', () => {
    const candles = candlesFromCloses([1, 2, 3]);
    expect(() => macd(candles, 3, 3, 2)).toThrow();
    expect(() => macd(candles, 5, 3, 2)).toThrow();
    expect(() => macd(candles, 2, 3, 0)).toThrow();
  });

  it('giữ nguyên ts của từng nến', () => {
    const candles = candlesFromCloses([1, 2, 3, 4, 5]);
    const result = macd(candles, 2, 3, 2);
    expect(result.map((p) => p.ts)).toEqual(candles.map((c) => c.ts));
  });
});
