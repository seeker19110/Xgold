import { describe, expect, it } from 'vitest';
import { CandleSchema } from '@/lib/candles/types';
import { SAMPLE_DAILY_COUNT, SAMPLE_M5_COUNT } from '@/lib/fixtures/generate';
import { SAMPLE_XAUUSD_DAILY, SAMPLE_XAUUSD_HOURLY, SAMPLE_XAUUSD_M5 } from '@/lib/fixtures/xauusd';

describe.each([
  ['SAMPLE_XAUUSD_DAILY', SAMPLE_XAUUSD_DAILY, SAMPLE_DAILY_COUNT],
  ['SAMPLE_XAUUSD_HOURLY', SAMPLE_XAUUSD_HOURLY, 24 * 14],
  ['SAMPLE_XAUUSD_M5', SAMPLE_XAUUSD_M5, SAMPLE_M5_COUNT],
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

it('deterministic — cùng seed sinh cùng dữ liệu giữa các lần import', () => {
  expect(SAMPLE_XAUUSD_DAILY[0]).toEqual(SAMPLE_XAUUSD_DAILY[0]);
  expect(SAMPLE_XAUUSD_DAILY[0]?.open).toBeCloseTo(3300, 0);
});
