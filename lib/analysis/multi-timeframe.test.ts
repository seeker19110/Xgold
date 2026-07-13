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
  return { enabled: true, buyThreshold, rules };
}

// Chu kỳ nhỏ để dùng được fixture 4 nến (khớp combine.test.ts).
const P: AnalysisParams = { ...DEFAULT_ANALYSIS_PARAMS, rsiPeriod: 2 };

// Chuỗi giảm rồi tăng: RSI(2) tại index 2 = 100 (quá mua → Bán), tại index 3 = 25 (quá bán → Mua).
const BUY_AT_LAST = candlesFromCloses([44, 44.25, 44.5, 43.75]); // index 3 (cuối) → Mua
const SELL_AT_LAST = candlesFromCloses([44, 44.25, 44.5]); // index 2 (cuối) → Bán
// Giá đứng yên hoàn toàn → gain=loss=0 → RSI = 50 (quy ước rsiFromAverages) → Trung lập.
const NEUTRAL_AT_LAST = candlesFromCloses([44, 44, 44]);

describe('computeConfluence', () => {
  it('mọi khung đều Mua → overall buy & meanNorm = +1', () => {
    const config = testConfig({ 'rsi-zone': 1 });
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
    const config = testConfig({ 'rsi-zone': 1 });
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
    const config = testConfig({ 'rsi-zone': 1 });
    const result = computeConfluence({ '1h': [], '4h': [], '1D': [], '1W': [] }, config, P);

    expect(result.perTimeframe.every((v) => v.suggestion === null)).toBe(true);
    expect(result.neutralCount).toBe(4);
    expect(result.meanNorm).toBe(0);
    expect(result.overall).toBe('neutral');
  });

  it('ngưỡng biên +0.25: meanNorm = 0.25 (đúng ngưỡng) → overall buy (>=)', () => {
    // Chỉ rsi-zone bật, weight 1 → norm mỗi khung ∈ {-1,0,1}. Kết hợp 2 Mua (+1,+1), 1 Trung lập (0),
    // 1 Bán (-1) trên 4 khung có suggestion → mean = (1+1+0-1)/4 = 0.25 (tính tay).
    const config = testConfig({ 'rsi-zone': 1 });
    const result = computeConfluence(
      {
        '1h': BUY_AT_LAST, // norm +1
        '4h': BUY_AT_LAST, // norm +1
        '1D': NEUTRAL_AT_LAST, // norm 0
        '1W': SELL_AT_LAST, // norm -1
      },
      config,
      P,
    );

    // Xác nhận khung '1D' quả thật cho norm 0 (Trung lập) trước khi khẳng định boundary — không
    // đoán, đọc lại giá trị thật do computeConfluence trả về.
    const neutralVerdict = result.perTimeframe.find((v) => v.timeframe === '1D');
    expect(neutralVerdict?.norm).toBe(0);

    expect(result.meanNorm).toBeCloseTo(0.25, 12);
    expect(result.meanNorm).toBeGreaterThanOrEqual(CONFLUENCE_THRESHOLD);
    expect(result.overall).toBe('buy');
  });

  it('ngưỡng biên -0.25: meanNorm = -0.25 (đúng ngưỡng) → overall sell (<=)', () => {
    const config = testConfig({ 'rsi-zone': 1 });
    const result = computeConfluence(
      {
        '1h': SELL_AT_LAST, // norm -1
        '4h': SELL_AT_LAST, // norm -1
        '1D': NEUTRAL_AT_LAST, // norm 0
        '1W': BUY_AT_LAST, // norm +1
      },
      config,
      P,
    );

    expect(result.meanNorm).toBeCloseTo(-0.25, 12);
    expect(result.meanNorm).toBeLessThanOrEqual(-CONFLUENCE_THRESHOLD);
    expect(result.overall).toBe('sell');
  });

  it('meanNorm = 0 (giữa hai ngưỡng) → overall neutral', () => {
    const config = testConfig({ 'rsi-zone': 1 });
    const result = computeConfluence(
      { '1h': BUY_AT_LAST, '4h': SELL_AT_LAST, '1D': [], '1W': [] },
      config,
      P,
    );

    expect(result.meanNorm).toBe(0);
    expect(result.overall).toBe('neutral');
  });
});
