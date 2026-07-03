import { describe, expect, it } from 'vitest';
import { sma } from '@/lib/indicators/sma';
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

describe('sma', () => {
  it('SMA(3) trên [1,2,3,4,5] — tính tay: [null,null,2,3,4]', () => {
    const candles = candlesFromCloses([1, 2, 3, 4, 5]);
    const result = sma(candles, 3);
    expect(result.map((p) => p.value)).toEqual([null, null, 2, 3, 4]);
  });

  it('period = 1 trả đúng bằng giá đóng cửa từng nến', () => {
    const candles = candlesFromCloses([10, 20, 30]);
    const result = sma(candles, 1);
    expect(result.map((p) => p.value)).toEqual([10, 20, 30]);
  });

  it('mảng ngắn hơn period → toàn null', () => {
    const candles = candlesFromCloses([1, 2]);
    const result = sma(candles, 5);
    expect(result.map((p) => p.value)).toEqual([null, null]);
  });

  it('mảng rỗng trả mảng rỗng', () => {
    expect(sma([], 3)).toEqual([]);
  });

  it('ném lỗi khi period <= 0', () => {
    expect(() => sma(candlesFromCloses([1, 2]), 0)).toThrow();
  });

  it('giữ nguyên ts của từng nến', () => {
    const candles = candlesFromCloses([1, 2, 3]);
    const result = sma(candles, 2);
    expect(result.map((p) => p.ts)).toEqual(candles.map((c) => c.ts));
  });
});
