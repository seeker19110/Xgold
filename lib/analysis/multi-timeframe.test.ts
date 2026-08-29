import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { computeConfluence, CONFLUENCE_THRESHOLD } from '@/lib/analysis/multi-timeframe';
import type { AnalysisConfig, RuleSetting } from '@/lib/analysis/config';
import {
  DEFAULT_ANALYSIS_PARAMS,
  RULE_IDS,
  type AnalysisParams,
  type RuleId,
} from '@/lib/analysis/types';

/** Cùng fixture tính tay của combine.test.ts: RSI(2) trên [44,44.25,44.5,43.75] = [null,null,100,25]. */
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

/** Cấu hình test: chỉ bật quy tắc được liệt kê, mỗi quy tắc có trọng số riêng. */
function testConfig(enabled: Partial<Record<RuleId, number>>, buyThreshold = 0.5): AnalysisConfig {
  const rules = Object.fromEntries(
    RULE_IDS.map((id) => {
      const weight = enabled[id];
      return [
        id,
        weight === undefined ? { enabled: false, weight: 0 } : { enabled: true, weight },
      ] satisfies [string, RuleSetting];
    }),
  ) as AnalysisConfig['rules'];
  // Các giá trị dưới đây tính tay theo phép cộng thẳng của v1 → cố định `linear`;
  // chế độ `grouped` (mặc định Đợt C) có bộ test riêng ở cuối file.
  return {
    enabled: true,
    combineMode: 'linear',
    regimeAware: false,
    smoothingSpan: 0,
    buyThreshold,
    rules,
  };
}

// Chu kỳ nhỏ để dùng được fixture 3 nến (khớp combine.test.ts).
const P: AnalysisParams = { ...DEFAULT_ANALYSIS_PARAMS, maSlowPeriod: 3 };

// price-vs-ma so giá đóng cửa với SMA3 tại nến cuối:
const BUY_AT_LAST = candlesFromCloses([1, 2, 3]); // SMA3 = 2, close 3 > 2 → Mua
const SELL_AT_LAST = candlesFromCloses([3, 2, 1]); // SMA3 = 2, close 1 < 2 → Bán
const NEUTRAL_AT_LAST = candlesFromCloses([2, 2, 2]); // close đúng bằng SMA3 → Trung lập

describe('computeConfluence', () => {
  it('mọi khung đều Mua → overall buy & meanNorm = +1', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence(
      { '1h': BUY_AT_LAST, '4h': BUY_AT_LAST, '1D': BUY_AT_LAST, '1W': BUY_AT_LAST },
      config,
      P,
    );

    expect(result.buyCount).toBe(4);
    expect(result.sellCount).toBe(0);
    expect(result.neutralCount).toBe(0);
    expect(result.meanNorm).toBeCloseTo(1, 12);
    expect(result.overall).toBe('buy');
    expect(result.perTimeframe).toHaveLength(4);
    expect(result.perTimeframe.every((v) => v.norm === 1)).toBe(true);
  });

  it('khung thiếu nến (mảng rỗng) → suggestion null, bị loại khỏi meanNorm nhưng tính vào neutralCount', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence(
      { '1h': BUY_AT_LAST, '4h': BUY_AT_LAST, '1D': BUY_AT_LAST, '1W': [] },
      config,
      P,
    );

    const missing = result.perTimeframe.find((v) => v.timeframe === '1W');
    expect(missing?.suggestion).toBeNull();
    expect(missing?.norm).toBe(0);
    expect(result.neutralCount).toBe(1);
    expect(result.buyCount).toBe(3);
    // meanNorm chỉ trung bình trên 3 khung có suggestion (bỏ khung null) = (1+1+1)/3 = 1, KHÔNG /4.
    expect(result.meanNorm).toBeCloseTo(1, 12);
    expect(result.overall).toBe('buy');
  });

  it('không khung nào có suggestion → meanNorm = 0, overall neutral (không chia 0)', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence({ '1h': [], '4h': [], '1D': [], '1W': [] }, config, P);

    expect(result.perTimeframe.every((v) => v.suggestion === null)).toBe(true);
    expect(result.neutralCount).toBe(4);
    expect(result.meanNorm).toBe(0);
    expect(result.overall).toBe('neutral');
  });

  it('Đợt C: khung lớn có tiếng nói lớn hơn — 1W ngược chiều lật kết quả của 1h+4h', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence(
      {
        '1h': BUY_AT_LAST, // norm +1, trọng số 1
        '4h': BUY_AT_LAST, // norm +1, trọng số 2
        '1D': NEUTRAL_AT_LAST, // norm 0, trọng số 3
        '1W': SELL_AT_LAST, // norm −1, trọng số 4
      },
      config,
      P,
    );

    // Xác nhận khung '1D' quả thật cho norm 0 trước khi khẳng định phép tính — không đoán.
    expect(result.perTimeframe.find((v) => v.timeframe === '1D')?.norm).toBe(0);
    // (1·1 + 1·2 + 0·3 − 1·4) / (1+2+3+4) = −1/10 = −0.1.
    expect(result.meanNorm).toBeCloseTo(-0.1, 12);
    expect(result.overall).toBe('neutral');
    // Trung bình cộng của v1 sẽ cho +0.25 → 'buy'; trọng số theo khung đảo lại kết luận đó.
  });

  it('ngưỡng biên +0.25: 1h Mua (ts 1) + 1D Trung lập (ts 3) → 1/4 = 0.25 → buy (>=)', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence({ '1h': BUY_AT_LAST, '1D': NEUTRAL_AT_LAST }, config, P);

    expect(result.meanNorm).toBeCloseTo(0.25, 12);
    expect(result.meanNorm).toBeGreaterThanOrEqual(CONFLUENCE_THRESHOLD);
    expect(result.overall).toBe('buy');
  });

  it('ngưỡng biên -0.25: 1h Bán + 1D Trung lập → −0.25 → sell (<=)', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence({ '1h': SELL_AT_LAST, '1D': NEUTRAL_AT_LAST }, config, P);

    expect(result.meanNorm).toBeCloseTo(-0.25, 12);
    expect(result.meanNorm).toBeLessThanOrEqual(-CONFLUENCE_THRESHOLD);
    expect(result.overall).toBe('sell');
  });

  it('meanNorm = 0 (giữa hai ngưỡng) → overall neutral', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence(
      { '1h': NEUTRAL_AT_LAST, '4h': NEUTRAL_AT_LAST, '1D': [], '1W': [] },
      config,
      P,
    );

    expect(result.meanNorm).toBe(0);
    expect(result.overall).toBe('neutral');
  });

  it('khung thiếu nến không tham gia mẫu số (không kéo trung bình về 0)', () => {
    const config = testConfig({ 'price-vs-ma': 1 });
    const result = computeConfluence({ '1W': BUY_AT_LAST }, config, P);

    // Chỉ 1W có dữ liệu → meanNorm = norm của chính nó, không bị 3 khung rỗng pha loãng.
    expect(result.meanNorm).toBeCloseTo(1, 12);
    expect(result.overall).toBe('buy');
    expect(result.neutralCount).toBe(3);
  });
});
