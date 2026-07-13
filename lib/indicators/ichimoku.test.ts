import { describe, expect, it } from 'vitest';
import { cloudAt, ichimokuCloud } from '@/lib/indicators/ichimoku';
import type { Candle } from '@/lib/candles/types';

function candle(day: number, high: number, low: number): Candle {
  const mid = (high + low) / 2;
  return {
    ts: new Date(Date.UTC(2026, 0, day)).toISOString(),
    open: mid,
    high,
    low,
    close: mid,
    volume: null,
  };
}

describe('ichimokuCloud', () => {
  // conversionPeriod=2, basePeriod=3, spanBPeriod=4 — tính tay từng donchian.
  const candles: Candle[] = [
    candle(1, 5, 1),
    candle(2, 6, 2),
    candle(3, 7, 1),
    candle(4, 4, 0),
    candle(5, 8, 3),
  ];
  const points = ichimokuCloud(candles, 2, 3, 4);

  it('spanA null cho tới khi đủ dữ liệu basePeriod, spanB null cho tới khi đủ spanBPeriod', () => {
    expect(points.map((p) => p.spanA)).toEqual([null, null, 4, 3.5, 4]);
    expect(points.map((p) => p.spanB)).toEqual([null, null, null, 3.5, 4]);
  });

  it('period <= 0 ném lỗi', () => {
    expect(() => ichimokuCloud(candles, 0, 3, 4)).toThrow('period phải > 0');
  });
});

describe('cloudAt', () => {
  const candles: Candle[] = [candle(1, 10, 8), candle(2, 12, 8), candle(3, 6, 4)];
  // conv(1)=mid, base(2)=avg(max2H,min2L), spanB(3)=avg(max3H,min3L).
  const points = ichimokuCloud(candles, 1, 2, 3);
  // index2: conv=5, base=avg(max(12,6)=12,min(8,4)=4)=8 → spanA=6.5; spanB=avg(max(10,12,6)=12,min(8,8,4)=4)=8.

  it('mây xanh khi spanA ≥ spanB (top/bot lấy đúng max/min)', () => {
    const cloud = cloudAt(points, 2, 0);
    expect(cloud).toEqual({ top: 8, bot: 6.5, green: false });
  });

  it('null khi nến nguồn (index - displacement) ngoài phạm vi hoặc thiếu dữ liệu', () => {
    expect(cloudAt(points, 0, 5)).toBeNull();
    expect(cloudAt(points, 1, 0)).toBeNull(); // spanB chưa có ở index 1
  });
});
