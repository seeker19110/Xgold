import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { evaluateAt, signalEvents, suggestLatest } from '@/lib/analysis/combine';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import type { AnalysisConfig, RuleSetting } from '@/lib/analysis/config';
import {
  DEFAULT_ANALYSIS_PARAMS,
  RULE_IDS,
  type AnalysisParams,
  type RuleId,
} from '@/lib/analysis/types';

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

/** Cấu hình test: mọi quy tắc TẮT trừ những quy tắc chỉ định — tách bạch từng ca tính tay. */
function testConfig(enabled: Partial<Record<RuleId, number>>, buyThreshold = 0.25): AnalysisConfig {
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

const P: AnalysisParams = {
  ...DEFAULT_ANALYSIS_PARAMS,
  maFastPeriod: 2,
  maSlowPeriod: 3,
  rsiPeriod: 2,
  macdFast: 2,
  macdSlow: 3,
  macdSignal: 2,
  bbPeriod: 3,
  bbMultiplier: 1,
};

describe('evaluateAt', () => {
  it('một quy tắc, trọng số 1: score = ±1 đúng theo hướng quy tắc', () => {
    // RSI(2) trên [44,44.25,44.5,43.75] = [null,null,100,25] (tính tay ở rsi.test.ts).
    const inputs = computeAnalysisInputs(candlesFromCloses([44, 44.25, 44.5, 43.75]), P);
    const config = testConfig({ 'rsi-zone': 1 }, 0.5);

    const sell = evaluateAt(inputs, config, 2, P);
    expect(sell).toMatchObject({ direction: 'sell', score: -1, maxScore: 1 });
    expect(sell.signals).toHaveLength(1);

    const buy = evaluateAt(inputs, config, 3, P);
    expect(buy).toMatchObject({ direction: 'buy', score: 1, maxScore: 1 });
  });

  it('tổng hợp trái chiều có trọng số — tính tay: 0.2 + 0.1 − 0.15 = 0.15 < ngưỡng 0.25 → Trung lập', () => {
    // Chuỗi giảm đều [5,4,3,2,1] tại index 4:
    //  - rsi-zone (0.2): toàn giảm → RSI 0 < 30 → Mua (+0.2)
    //  - bb-touch (0.1): cửa sổ [3,2,1] basis 2, σ = √(2/3), lower ≈ 1.184; close 1 ≤ lower → Mua (+0.1)
    //  - price-vs-ma (0.15): close 1 < SMA3 = 2 → Bán (−0.15)
    const inputs = computeAnalysisInputs(candlesFromCloses([5, 4, 3, 2, 1]), P);
    const config = testConfig({ 'rsi-zone': 0.2, 'bb-touch': 0.1, 'price-vs-ma': 0.15 });

    const result = evaluateAt(inputs, config, 4, P);
    expect(result.score).toBeCloseTo(0.15, 12);
    expect(result.maxScore).toBeCloseTo(0.45, 12);
    expect(result.direction).toBe('neutral');
    expect(result.signals).toHaveLength(3);
  });

  it('tắt quy tắc ngược chiều → score 0.3 ≥ ngưỡng 0.25 → Mua', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([5, 4, 3, 2, 1]), P);
    const config = testConfig({ 'rsi-zone': 0.2, 'bb-touch': 0.1 });

    const result = evaluateAt(inputs, config, 4, P);
    expect(result.score).toBeCloseTo(0.3, 12);
    expect(result.direction).toBe('buy');
  });

  it('tắt hết quy tắc → score 0, maxScore 0, Trung lập, không có signal nào', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3]), P);
    const result = evaluateAt(inputs, testConfig({}), 2, P);
    expect(result).toMatchObject({ direction: 'neutral', score: 0, maxScore: 0, signals: [] });
  });

  it('quy tắc thiếu dữ liệu đóng góp 0 nhưng maxScore giữ nguyên trọng số (|score| chỉ giảm)', () => {
    // index 1: RSI(2) chưa có giá trị → neutral "chưa đủ dữ liệu" → score 0, maxScore vẫn 1.
    const inputs = computeAnalysisInputs(candlesFromCloses([44, 44.25]), P);
    const result = evaluateAt(inputs, testConfig({ 'rsi-zone': 1 }), 1, P);
    expect(result).toMatchObject({ direction: 'neutral', score: 0, maxScore: 1 });
    expect(result.signals[0]?.reason).toContain('Chưa đủ dữ liệu');
  });

  it('index ngoài phạm vi → ném lỗi rõ ràng', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2]), P);
    expect(() => evaluateAt(inputs, testConfig({}), 5, P)).toThrow();
  });
});

describe('suggestLatest', () => {
  it('trả gợi ý tại nến cuối cùng', () => {
    const candles = candlesFromCloses([44, 44.25, 44.5, 43.75]);
    const result = suggestLatest(candles, testConfig({ 'rsi-zone': 1 }, 0.5), P);
    expect(result?.direction).toBe('buy');
    expect(result?.ts).toBe(candles[3]?.ts);
  });

  it('không có nến nào → null (không đoán)', () => {
    expect(suggestLatest([], testConfig({ 'rsi-zone': 1 }), P)).toBeNull();
  });
});

describe('signalEvents', () => {
  it('chỉ ghi sự kiện khi phân loại CHUYỂN sang Mua/Bán — tính tay từng nến', () => {
    // RSI(2) = [null,null,100,25]: phân loại = [neutral, neutral, sell, buy]
    // → 2 sự kiện: sell tại nến 2, buy tại nến 3.
    const candles = candlesFromCloses([44, 44.25, 44.5, 43.75]);
    const events = signalEvents(candles, testConfig({ 'rsi-zone': 1 }, 0.5), P);
    expect(events).toEqual([
      { ts: candles[2]?.ts, direction: 'sell', score: -1 },
      { ts: candles[3]?.ts, direction: 'buy', score: 1 },
    ]);
  });

  it('phân loại giữ nguyên liên tiếp → không lặp sự kiện', () => {
    // [44, 44.25, 44.5, 44.75]: RSI(2) = [null, null, 100, 100] → sell tại nến 2, nến 3 vẫn sell
    // → chỉ 1 sự kiện.
    const candles = candlesFromCloses([44, 44.25, 44.5, 44.75]);
    const events = signalEvents(candles, testConfig({ 'rsi-zone': 1 }, 0.5), P);
    expect(events).toHaveLength(1);
    expect(events[0]?.direction).toBe('sell');
  });

  it('không có nến → không có sự kiện', () => {
    expect(signalEvents([], testConfig({ 'rsi-zone': 1 }), P)).toEqual([]);
  });
});
