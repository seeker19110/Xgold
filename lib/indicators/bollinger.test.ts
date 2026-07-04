import { describe, expect, it } from 'vitest';
import { bollinger } from '@/lib/indicators/bollinger';
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

describe('bollinger', () => {
  it('BB(3, 2) trên [1..5] — tính tay: σ population của 3 số liên tiếp cách đều = √(2/3)', () => {
    // Cửa sổ [1,2,3]: mean 2, var = (1+0+1)/3 = 2/3 → σ = √(2/3); các cửa sổ sau cùng dạng, σ như nhau.
    const sigma = Math.sqrt(2 / 3);
    const result = bollinger(candlesFromCloses([1, 2, 3, 4, 5]), 3, 2);

    expect(result.map((p) => p.basis)).toEqual([null, null, 2, 3, 4]);
    expect(result[2]?.upper).toBeCloseTo(2 + 2 * sigma, 12);
    expect(result[2]?.lower).toBeCloseTo(2 - 2 * sigma, 12);
    expect(result[4]?.upper).toBeCloseTo(4 + 2 * sigma, 12);
    expect(result[4]?.lower).toBeCloseTo(4 - 2 * sigma, 12);
  });

  it('giá đứng yên → σ = 0 → ba băng trùng nhau (không lỗi chia)', () => {
    const result = bollinger(candlesFromCloses([5, 5, 5, 5]), 3, 2);
    expect(result[3]).toEqual({ ts: result[3]?.ts, basis: 5, upper: 5, lower: 5 });
  });

  it('mảng ngắn hơn period → toàn null', () => {
    const result = bollinger(candlesFromCloses([1, 2]), 3, 2);
    expect(result.map((p) => p.basis)).toEqual([null, null]);
    expect(result.map((p) => p.upper)).toEqual([null, null]);
  });

  it('mảng rỗng trả mảng rỗng', () => {
    expect(bollinger([], 3, 2)).toEqual([]);
  });

  it('ném lỗi khi period <= 0 hoặc multiplier <= 0', () => {
    const candles = candlesFromCloses([1, 2, 3]);
    expect(() => bollinger(candles, 0, 2)).toThrow();
    expect(() => bollinger(candles, 3, 0)).toThrow();
  });

  it('giữ nguyên ts của từng nến', () => {
    const candles = candlesFromCloses([1, 2, 3, 4]);
    const result = bollinger(candles, 3, 2);
    expect(result.map((p) => p.ts)).toEqual(candles.map((c) => c.ts));
  });
});
