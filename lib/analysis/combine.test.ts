import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { evaluateAt, evaluateSeries, signalEvents, suggestLatest } from '@/lib/analysis/combine';
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
  // Các giá trị dưới đây tính tay theo phép cộng thẳng của v1 → cố định `linear` và TẮT làm trơn
  // (`smoothingSpan: 0`); chế độ `grouped` và lớp làm trơn có bộ test riêng ở cuối file.
  return {
    enabled: true,
    combineMode: 'linear',
    regimeAware: false,
    smoothingSpan: 0,
    buyThreshold,
    rules,
  };
}

const P: AnalysisParams = {
  ...DEFAULT_ANALYSIS_PARAMS,
  maFastPeriod: 2,
  maSlowPeriod: 3,
  rsiPeriod: 2,
};

describe('evaluateAt', () => {
  it('một quy tắc, trọng số 1: score = ±1 đúng theo hướng quy tắc', () => {
    // price-vs-ma so giá đóng cửa với SMA3. [1,2,3,1]:
    //   index 2 → SMA3 = (1+2+3)/3 = 2, close 3 > 2 → Mua.
    //   index 3 → SMA3 = (2+3+1)/3 = 2, close 1 < 2 → Bán.
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3, 1]), P);
    const config = testConfig({ 'price-vs-ma': 1 }, 0.5);

    const buy = evaluateAt(inputs, config, 2, P);
    expect(buy).toMatchObject({ direction: 'buy', score: 1, maxScore: 1, norm: 1 });
    expect(buy.signals).toHaveLength(1);

    const sell = evaluateAt(inputs, config, 3, P);
    expect(sell).toMatchObject({ direction: 'sell', score: -1, maxScore: 1, norm: -1 });
  });

  it('ngưỡng là TỶ LỆ trên maxScore: 0.15/0.45 = 0.33 ≥ 0.25 → Mua (đổi so với v1)', () => {
    // [1,2,3] tại index 2:
    //  - price-vs-ma (0.15): close 3 > SMA3 = 2 → Mua (+0.15)
    //  - ma-cross (0.3): không có giao cắt SMA2/SMA3 trong cửa sổ → Trung lập (0), nhưng vẫn
    //    đóng góp trọng số vào maxScore.
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3]), P);
    const config = testConfig({ 'price-vs-ma': 0.15, 'ma-cross': 0.3 });

    const result = evaluateAt(inputs, config, 2, P);
    expect(result.score).toBeCloseTo(0.15, 12);
    expect(result.maxScore).toBeCloseTo(0.45, 12);
    // Đợt C: `buyThreshold` được hiểu là tỷ lệ trên tổng trọng số đang bật, không còn là con số
    // tuyệt đối. Nhờ vậy ngưỡng giữ nguyên ý nghĩa khi người dùng tắt bớt quy tắc (v1: tắt quy tắc
    // làm ngưỡng ngầm khó lên) và trùng đơn vị với `ratio` mà bảng hiệu chuẩn xác suất dùng.
    expect(result.direction).toBe('buy');
    expect(result.signals).toHaveLength(2);
  });

  it('hai quy tắc cùng chiều → score bằng tổng trọng số, ratio = 1 → Mua', () => {
    // [3,2,1,2,3] tại index 4: SMA2 vừa cắt lên SMA3 → ma-cross Mua; close 3 > SMA3 = 2 → Mua.
    const inputs = computeAnalysisInputs(candlesFromCloses([3, 2, 1, 2, 3]), P);
    const config = testConfig({ 'ma-cross': 0.2, 'price-vs-ma': 0.1 });

    const result = evaluateAt(inputs, config, 4, P);
    expect(result.score).toBeCloseTo(0.3, 12);
    expect(result.maxScore).toBeCloseTo(0.3, 12);
    expect(result.direction).toBe('buy');
  });

  it('tắt hết quy tắc → score 0, maxScore 0, Trung lập, không có signal nào', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3]), P);
    const result = evaluateAt(inputs, testConfig({}), 2, P);
    expect(result).toMatchObject({ direction: 'neutral', score: 0, maxScore: 0, signals: [] });
  });

  it('quy tắc thiếu dữ liệu đóng góp 0 nhưng maxScore giữ nguyên trọng số (|score| chỉ giảm)', () => {
    // index 1: SMA3 chưa có giá trị → neutral "chưa đủ dữ liệu" → score 0, maxScore vẫn 1.
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2]), P);
    const result = evaluateAt(inputs, testConfig({ 'price-vs-ma': 1 }), 1, P);
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
    const candles = candlesFromCloses([1, 2, 3]);
    const result = suggestLatest(candles, testConfig({ 'price-vs-ma': 1 }, 0.5), P);
    expect(result?.direction).toBe('buy');
    expect(result?.ts).toBe(candles[2]?.ts);
  });

  it('không có nến nào → null (không đoán)', () => {
    expect(suggestLatest([], testConfig({ 'price-vs-ma': 1 }), P)).toBeNull();
  });
});

describe('signalEvents', () => {
  it('chỉ ghi sự kiện khi phân loại CHUYỂN sang Mua/Bán — tính tay từng nến', () => {
    // price-vs-ma trên [1,2,3,1]: phân loại = [neutral, neutral, buy, sell]
    // → 2 sự kiện: buy tại nến 2, sell tại nến 3.
    const candles = candlesFromCloses([1, 2, 3, 1]);
    const events = signalEvents(candles, testConfig({ 'price-vs-ma': 1 }, 0.5), P);
    expect(events).toEqual([
      { ts: candles[2]?.ts, direction: 'buy', score: 1 },
      { ts: candles[3]?.ts, direction: 'sell', score: -1 },
    ]);
  });

  it('phân loại giữ nguyên liên tiếp → không lặp sự kiện', () => {
    // [1,2,3,4]: index 2 → close 3 > SMA3 2 → Mua; index 3 → close 4 > SMA3 3 → vẫn Mua
    // → chỉ 1 sự kiện.
    const candles = candlesFromCloses([1, 2, 3, 4]);
    const events = signalEvents(candles, testConfig({ 'price-vs-ma': 1 }, 0.5), P);
    expect(events).toHaveLength(1);
    expect(events[0]?.direction).toBe('buy');
  });

  it('không có nến → không có sự kiện', () => {
    expect(signalEvents([], testConfig({ 'price-vs-ma': 1 }), P)).toEqual([]);
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

describe('evaluateSeries — lớp làm trơn EMA (ADR-0015)', () => {
  // Chuỗi zig-zag quanh SMA3 làm price-vs-ma lật dấu liên tục — đúng dạng nhiễu mà lớp làm trơn
  // sinh ra để xử lý.
  const ZIGZAG = candlesFromCloses([2, 2, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1]);

  function directions(span: number): string[] {
    const inputs = computeAnalysisInputs(ZIGZAG, P);
    const config = { ...testConfig({ 'price-vs-ma': 1 }, 0.25), smoothingSpan: span };
    return evaluateSeries(inputs, config, P).map((s) => s.direction);
  }

  it('tắt làm trơn → hướng lật dấu theo từng nến', () => {
    const raw = directions(0);
    let flips = 0;
    for (let i = 1; i < raw.length; i++) if (raw[i] !== raw[i - 1]) flips++;
    expect(flips).toBeGreaterThan(4);
  });

  it('bật làm trơn → số lần đổi hướng giảm hẳn', () => {
    const raw = directions(0);
    const smooth = directions(8);
    const count = (xs: string[]) => {
      let n = 0;
      for (let i = 1; i < xs.length; i++) if (xs[i] !== xs[i - 1]) n++;
      return n;
    };
    expect(count(smooth)).toBeLessThan(count(raw));
  });

  it('`norm` là bản ĐÃ làm trơn, còn `score`/`maxScore` giữ nguyên giá trị thô', () => {
    const inputs = computeAnalysisInputs(ZIGZAG, P);
    const config = { ...testConfig({ 'price-vs-ma': 1 }, 0.25), smoothingSpan: 8 };
    const series = evaluateSeries(inputs, config, P);
    const last = series[series.length - 1]!;
    // Quy tắc đơn, trọng số 1 → score thô luôn là ±1; norm đã làm trơn thì không còn là ±1.
    expect(Math.abs(last.score)).toBe(1);
    expect(Math.abs(last.norm)).toBeLessThan(1);
    // Và norm phải nằm trong dải hợp lệ để dùng chung ngưỡng + bảng hiệu chuẩn.
    for (const s of series) expect(Math.abs(s.norm)).toBeLessThanOrEqual(1 + 1e-12);
  });

  it('NHÂN QUẢ: kết quả tại nến i không đổi khi có thêm nến phía sau', () => {
    const config = { ...testConfig({ 'price-vs-ma': 1 }, 0.25), smoothingSpan: 8 };
    const full = evaluateSeries(computeAnalysisInputs(ZIGZAG, P), config, P);
    const cut = evaluateSeries(computeAnalysisInputs(ZIGZAG.slice(0, 8), P), config, P);
    for (let i = 0; i < cut.length; i++) {
      expect(cut[i]!.norm).toBeCloseTo(full[i]!.norm, 12);
      expect(cut[i]!.direction).toBe(full[i]!.direction);
    }
  });

  it('suggestLatest và signalEvents dùng CÙNG đường đi (markers khớp gợi ý đang hiện)', () => {
    const config = { ...testConfig({ 'price-vs-ma': 1 }, 0.25), smoothingSpan: 8 };
    const latest = suggestLatest(ZIGZAG, config, P);
    const series = evaluateSeries(computeAnalysisInputs(ZIGZAG, P), config, P);
    expect(latest?.direction).toBe(series[series.length - 1]?.direction);
    expect(latest?.norm).toBeCloseTo(series[series.length - 1]!.norm, 12);
  });
});
