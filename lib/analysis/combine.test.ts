import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { evaluateAt, signalEvents, suggestLatest } from '@/lib/analysis/combine';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import {
  REDUNDANCY_FACTOR,
  REGIME_FAMILY_MULTIPLIER,
  RULE_FAMILY,
  type RuleFamily,
} from '@/lib/analysis/regime';
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
  // Các giá trị dưới đây tính tay theo phép cộng thẳng của v1 → cố định `linear`;
  // chế độ `grouped` (mặc định Đợt C) có bộ test riêng ở cuối file.
  return { enabled: true, combineMode: 'linear', regimeAware: false, buyThreshold, rules };
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

  it('ngưỡng là TỶ LỆ trên maxScore: 0.15/0.45 = 0.33 ≥ 0.25 → Mua (đổi so với v1)', () => {
    // Chuỗi giảm đều [5,4,3,2,1] tại index 4:
    //  - rsi-zone (0.2): toàn giảm → RSI 0 < 30 → Mua (+0.2)
    //  - bb-touch (0.1): cửa sổ [3,2,1] basis 2, σ = √(2/3), lower ≈ 1.184; close 1 ≤ lower → Mua (+0.1)
    //  - price-vs-ma (0.15): close 1 < SMA3 = 2 → Bán (−0.15)
    const inputs = computeAnalysisInputs(candlesFromCloses([5, 4, 3, 2, 1]), P);
    const config = testConfig({ 'rsi-zone': 0.2, 'bb-touch': 0.1, 'price-vs-ma': 0.15 });

    const result = evaluateAt(inputs, config, 4, P);
    expect(result.score).toBeCloseTo(0.15, 12);
    expect(result.maxScore).toBeCloseTo(0.45, 12);
    // Đợt C: `buyThreshold` được hiểu là tỷ lệ trên tổng trọng số đang bật, không còn là con số
    // tuyệt đối. Nhờ vậy ngưỡng giữ nguyên ý nghĩa khi người dùng tắt bớt quy tắc (v1: tắt quy tắc
    // làm ngưỡng ngầm khó lên) và trùng đơn vị với `ratio` mà bảng hiệu chuẩn xác suất dùng.
    expect(result.direction).toBe('buy');
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

describe('evaluateAt — chế độ `grouped` (Đợt C)', () => {
  const GP: AnalysisParams = { ...P, regimeLookback: 4, regimeTrendThreshold: 0.3 };

  /** Chỉ bật nhóm xu hướng, trọng số 0.25 / 0.1 / 0.15 (tổng 0.5, lớn nhất 0.25). */
  function trendOnly(): AnalysisConfig {
    return {
      ...testConfig({ 'ma-cross': 0.25, 'price-vs-ma': 0.1, 'ichimoku-cloud': 0.15 }),
      combineMode: 'grouped',
      regimeAware: true,
    };
  }

  it('chiết khấu trùng lặp: maxScore = (0.25 + 0.5×0.25) × hệ số chế độ, không phải tổng 0.5', () => {
    // Chuỗi tăng đều → ER = 1 ≥ 0.3 → chế độ `trend` → hệ số nhóm xu hướng 1.2.
    // Trọng số hiệu dụng = 0.25 + 0.5×(0.5 − 0.25) = 0.375 → maxScore = 0.375 × 1.2 = 0.45.
    const rising = computeAnalysisInputs(candlesFromCloses([10, 11, 12, 13, 14]), GP);
    const trend = evaluateAt(rising, trendOnly(), 4, GP);
    expect(trend.regime?.regime).toBe('trend');
    expect(trend.maxScore).toBeCloseTo(0.45, 12);

    // Dao động quanh một mức → ER = 0 → `range` → hệ số nhóm xu hướng 0.6 → 0.375 × 0.6 = 0.225.
    const choppy = computeAnalysisInputs(candlesFromCloses([10, 12, 10, 12, 10]), GP);
    const range = evaluateAt(choppy, trendOnly(), 4, GP);
    expect(range.regime?.regime).toBe('range');
    expect(range.maxScore).toBeCloseTo(0.225, 12);
  });

  it('`regimeAware: false` → gộp nhóm nhưng không nhân hệ số chế độ (maxScore = 0.375)', () => {
    const rising = computeAnalysisInputs(candlesFromCloses([10, 11, 12, 13, 14]), GP);
    const result = evaluateAt(rising, { ...trendOnly(), regimeAware: false }, 4, GP);
    expect(result.maxScore).toBeCloseTo(0.375, 12);
    expect(result.regime).toBeNull();
  });

  it('`linear` giữ nguyên hành vi v1: maxScore = tổng trọng số đang bật (0.5)', () => {
    const rising = computeAnalysisInputs(candlesFromCloses([10, 11, 12, 13, 14]), GP);
    const result = evaluateAt(rising, { ...trendOnly(), combineMode: 'linear' }, 4, GP);
    expect(result.maxScore).toBeCloseTo(0.5, 12);
    expect(result.regime).toBeNull();
  });

  it('score luôn khớp công thức gộp nhóm tính lại từ chính các verdict đã trả về', () => {
    const inputs = computeAnalysisInputs(
      candlesFromCloses([44, 44.25, 44.5, 43.75, 44.5, 45, 44, 43, 42.5, 43]),
      GP,
    );
    const config: AnalysisConfig = {
      ...testConfig({
        'ma-cross': 0.25,
        'price-vs-ma': 0.1,
        'rsi-zone': 0.15,
        'macd-cross': 0.2,
        'bb-touch': 0.05,
        'ichimoku-cloud': 0.15,
        'rsi-stack': 0.1,
      }),
      combineMode: 'grouped',
      regimeAware: true,
    };

    for (let i = 0; i < 10; i++) {
      const result = evaluateAt(inputs, config, i, GP);
      const regime = result.regime?.regime ?? 'range';

      const buckets = new Map<string, { signed: number; total: number; max: number }>();
      for (const signal of result.signals) {
        const family = RULE_FAMILY[signal.ruleId];
        const b = buckets.get(family) ?? { signed: 0, total: 0, max: 0 };
        const dir = signal.direction === 'buy' ? 1 : signal.direction === 'sell' ? -1 : 0;
        b.signed += dir * signal.weight;
        b.total += signal.weight;
        b.max = Math.max(b.max, signal.weight);
        buckets.set(family, b);
      }

      let expectedScore = 0;
      let expectedMax = 0;
      for (const [family, b] of buckets) {
        const effective =
          (b.max + REDUNDANCY_FACTOR * (b.total - b.max)) *
          REGIME_FAMILY_MULTIPLIER[regime][family as RuleFamily];
        expectedScore += (b.signed / b.total) * effective;
        expectedMax += effective;
      }

      expect(result.score).toBeCloseTo(expectedScore, 12);
      expect(result.maxScore).toBeCloseTo(expectedMax, 12);
      // Bất biến quan trọng: điểm chuẩn hoá luôn nằm trong [−1, 1] để dùng chung ngưỡng + bảng
      // hiệu chuẩn xác suất.
      expect(Math.abs(result.score) / result.maxScore).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});
