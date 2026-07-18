import { describe, expect, it } from 'vitest';
import { normalizeToPercent } from '@/lib/candles/percent-normalize';
import type { Candle } from '@/lib/candles/types';

function c(ts: string, close: number): Candle {
  return { ts, open: close, high: close, low: close, close, volume: 10 };
}

describe('normalizeToPercent', () => {
  it('chuỗi giá [100, 110, 90] → [0, 10, -10] (%)', () => {
    const candles: Candle[] = [
      c('2026-07-03T00:00:00.000Z', 100),
      c('2026-07-03T01:00:00.000Z', 110),
      c('2026-07-03T02:00:00.000Z', 90),
    ];

    const result = normalizeToPercent(candles);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ ts: candles[0]?.ts });
    expect(result[0]?.value).toBeCloseTo(0);
    expect(result[1]?.value).toBeCloseTo(10);
    expect(result[2]?.value).toBeCloseTo(-10);
  });

  it('close[0] = 0 → trả [] (không chia cho 0)', () => {
    const candles: Candle[] = [c('2026-07-03T00:00:00.000Z', 0), c('2026-07-03T01:00:00.000Z', 10)];

    expect(normalizeToPercent(candles)).toEqual([]);
  });

  it('mảng rỗng → trả []', () => {
    expect(normalizeToPercent([])).toEqual([]);
  });
});
