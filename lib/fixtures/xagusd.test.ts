import { describe, expect, it } from 'vitest';
import { CandleSchema } from '@/lib/candles/types';
import { SAMPLE_DAILY_COUNT, SAMPLE_M5_COUNT } from '@/lib/fixtures/generate';
import { SAMPLE_XAGUSD_DAILY, SAMPLE_XAGUSD_HOURLY, SAMPLE_XAGUSD_M5 } from '@/lib/fixtures/xagusd';

describe.each([
  ['SAMPLE_XAGUSD_DAILY', SAMPLE_XAGUSD_DAILY, SAMPLE_DAILY_COUNT],
  ['SAMPLE_XAGUSD_HOURLY', SAMPLE_XAGUSD_HOURLY, 24 * 14],
  ['SAMPLE_XAGUSD_M5', SAMPLE_XAGUSD_M5, SAMPLE_M5_COUNT],
])('%s', (_name, candles, expectedLength) => {
  it(`có đúng ${expectedLength} nến`, () => {
    expect(candles).toHaveLength(expectedLength);
  });

  it('mọi nến đều hợp lệ theo CandleSchema (ràng buộc OHLC)', () => {
    for (const c of candles) {
      expect(() => CandleSchema.parse(c)).not.toThrow();
    }
  });

  it('nến sắp theo thời gian tăng dần, không trùng ts', () => {
    for (let i = 1; i < candles.length; i++) {
      expect(Date.parse(candles[i]!.ts)).toBeGreaterThan(Date.parse(candles[i - 1]!.ts));
    }
  });
});

it('giá quanh mức bạc (~40 USD/oz), khác hẳn dải giá vàng', () => {
  expect(SAMPLE_XAGUSD_DAILY[0]?.open).toBeCloseTo(40, 0);
});
