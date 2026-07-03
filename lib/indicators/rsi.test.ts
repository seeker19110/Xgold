import { describe, expect, it } from 'vitest';
import { rsi } from '@/lib/indicators/rsi';
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

describe('rsi', () => {
  it('RSI(2) trên [44, 44.25, 44.5, 43.75] — tính tay Wilder: [null, null, 100, 25]', () => {
    // deltas: +0.25, +0.25, -0.75.
    // avgGain[2]=(0.25+0.25)/2=0.25, avgLoss[2]=0/2=0 → RSI=100 (avgLoss=0).
    // avgGain[3]=(0.25*1+0)/2=0.125, avgLoss[3]=(0*1+0.75)/2=0.375, RS=1/3, RSI=100-100/(4/3)=25.
    const candles = candlesFromCloses([44, 44.25, 44.5, 43.75]);
    const result = rsi(candles, 2);
    expect(result.map((p) => p.value)).toEqual([null, null, 100, 25]);
  });

  it('toàn tăng (mọi delta dương) → RSI = 100 từ index period trở đi', () => {
    const candles = candlesFromCloses([1, 2, 3, 4, 5, 6]);
    const result = rsi(candles, 2);
    expect(result.map((p) => p.value)).toEqual([null, null, 100, 100, 100, 100]);
  });

  it('toàn giảm (mọi delta âm) → RSI = 0 từ index period trở đi', () => {
    const candles = candlesFromCloses([6, 5, 4, 3, 2, 1]);
    const result = rsi(candles, 2);
    expect(result.map((p) => p.value)).toEqual([null, null, 0, 0, 0, 0]);
  });

  it('giá đứng yên hoàn toàn (mọi delta = 0) → RSI = 50 theo quy ước', () => {
    const candles = candlesFromCloses([5, 5, 5, 5, 5]);
    const result = rsi(candles, 2);
    expect(result.map((p) => p.value)).toEqual([null, null, 50, 50, 50]);
  });

  it('mảng ngắn hơn hoặc bằng period → toàn null', () => {
    const candles = candlesFromCloses([1, 2, 3]);
    const result = rsi(candles, 5);
    expect(result.map((p) => p.value)).toEqual([null, null, null]);

    const exact = rsi(candlesFromCloses([1, 2, 3]), 3);
    expect(exact.map((p) => p.value)).toEqual([null, null, null]);
  });

  it('mảng rỗng trả mảng rỗng', () => {
    expect(rsi([], 14)).toEqual([]);
  });

  it('ném lỗi khi period <= 0', () => {
    expect(() => rsi(candlesFromCloses([1, 2, 3]), 0)).toThrow();
  });

  it('giá trị RSI luôn trong khoảng [0, 100]', () => {
    const closes = [10, 12, 9, 15, 8, 20, 5, 25, 3, 30];
    const result = rsi(candlesFromCloses(closes), 3);
    for (const p of result) {
      if (p.value !== null) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(100);
      }
    }
  });
});
