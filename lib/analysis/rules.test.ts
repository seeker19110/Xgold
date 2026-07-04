import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import { DEFAULT_ANALYSIS_PARAMS, type AnalysisParams } from '@/lib/analysis/types';
import { findRecentCross } from '@/lib/analysis/rules/cross';
import { evaluateMaCross } from '@/lib/analysis/rules/ma-cross';
import { evaluatePriceVsMa } from '@/lib/analysis/rules/price-vs-ma';
import { evaluateRsiZone } from '@/lib/analysis/rules/rsi-zone';
import { evaluateMacdCross } from '@/lib/analysis/rules/macd-cross';
import { evaluateBbTouch } from '@/lib/analysis/rules/bb-touch';

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

/** Chu kỳ nhỏ để tính tay được (chuẩn Đợt 3) — production dùng DEFAULT_ANALYSIS_PARAMS. */
const P: AnalysisParams = {
  ...DEFAULT_ANALYSIS_PARAMS,
  maFastPeriod: 2,
  maSlowPeriod: 3,
  maCrossLookback: 3,
  rsiPeriod: 2,
  macdFast: 2,
  macdSlow: 3,
  macdSignal: 2,
  macdCrossLookback: 5,
  bbPeriod: 3,
  bbMultiplier: 1,
};

describe('findRecentCross', () => {
  it('bỏ qua nến có giá trị null thay vì đoán', () => {
    expect(findRecentCross([null, 1, 3], [null, 2, 2], 2, 3)).toEqual({ at: 2, direction: 'up' });
    expect(findRecentCross([null, null, 3], [null, 2, 2], 2, 3)).toBeNull();
  });

  it('trả giao cắt GẦN NHẤT khi có nhiều giao cắt trong cửa sổ', () => {
    // a cắt lên b tại index 1 (1→3 qua 2), rồi cắt xuống tại index 2 (3→1 qua 2).
    const a = [1, 3, 1];
    const b = [2, 2, 2];
    expect(findRecentCross(a, b, 2, 3)).toEqual({ at: 2, direction: 'down' });
  });
});

describe('evaluateMaCross (R1)', () => {
  // closes [4,3,2,1,2,3,4] → SMA2 = [null,3.5,2.5,1.5,1.5,2.5,3.5]; SMA3 = [null,null,3,2,5/3,2,3]
  // Golden cross duy nhất tại index 5: SMA2 đi từ 1.5 ≤ 5/3 (index 4) lên 2.5 > 2 (index 5).
  const vShape = computeAnalysisInputs(candlesFromCloses([4, 3, 2, 1, 2, 3, 4]), P);

  it('golden cross trong cửa sổ lookback → Mua', () => {
    const verdict = evaluateMaCross(vShape, 6, P);
    expect(verdict.direction).toBe('buy');
    expect(verdict.reason).toContain('Golden cross');
    expect(verdict.reason).toContain('1 nến trước');
  });

  it('giao cắt nằm NGOÀI cửa sổ lookback → Trung lập', () => {
    const verdict = evaluateMaCross(vShape, 6, { ...P, maCrossLookback: 1 });
    expect(verdict.direction).toBe('neutral');
  });

  it('death cross (chuỗi hình chữ Λ) → Bán', () => {
    // closes [1,2,3,4,3,2,1] → SMA2 = [null,1.5,2.5,3.5,3.5,2.5,1.5]; SMA3 = [null,null,2,3,10/3,3,2]
    // Death cross tại index 5: SMA2 từ 3.5 ≥ 10/3 (index 4) xuống 2.5 < 3 (index 5).
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3, 4, 3, 2, 1]), P);
    const verdict = evaluateMaCross(inputs, 6, P);
    expect(verdict.direction).toBe('sell');
    expect(verdict.reason).toContain('Death cross');
  });

  it('chưa đủ dữ liệu cho SMA chậm → Trung lập, nêu rõ lý do', () => {
    const verdict = evaluateMaCross(vShape, 1, P);
    expect(verdict.direction).toBe('neutral');
    expect(verdict.reason).toContain('Chưa đủ dữ liệu');
  });
});

describe('evaluatePriceVsMa (R2)', () => {
  const vShape = computeAnalysisInputs(candlesFromCloses([4, 3, 2, 1, 2, 3, 4]), P);

  it('giá trên SMA chậm → Mua; giá dưới → Bán', () => {
    // index 6: close 4 > SMA3 = 3; index 3: close 1 < SMA3 = 2 (tính tay ở describe R1).
    expect(evaluatePriceVsMa(vShape, 6, P).direction).toBe('buy');
    expect(evaluatePriceVsMa(vShape, 3, P).direction).toBe('sell');
  });

  it('giá đúng bằng SMA (chuỗi đứng yên) → Trung lập', () => {
    const flat = computeAnalysisInputs(candlesFromCloses([2, 2, 2]), P);
    expect(evaluatePriceVsMa(flat, 2, P).direction).toBe('neutral');
  });

  it('chưa đủ dữ liệu → Trung lập', () => {
    expect(evaluatePriceVsMa(vShape, 1, P).direction).toBe('neutral');
  });
});

describe('evaluateRsiZone (R3)', () => {
  // RSI(2) trên [44, 44.25, 44.5, 43.75] = [null, null, 100, 25] — tính tay ở rsi.test.ts.
  const inputs = computeAnalysisInputs(candlesFromCloses([44, 44.25, 44.5, 43.75]), P);

  it('RSI 100 > 70 → Bán (quá mua); RSI 25 < 30 → Mua (quá bán)', () => {
    const overbought = evaluateRsiZone(inputs, 2, P);
    expect(overbought.direction).toBe('sell');
    expect(overbought.reason).toContain('quá mua');

    const oversold = evaluateRsiZone(inputs, 3, P);
    expect(oversold.direction).toBe('buy');
    expect(oversold.reason).toContain('quá bán');
  });

  it('giá đứng yên → RSI 50 (quy ước) → Trung lập', () => {
    const flat = computeAnalysisInputs(candlesFromCloses([5, 5, 5, 5]), P);
    const verdict = evaluateRsiZone(flat, 3, P);
    expect(verdict.direction).toBe('neutral');
    expect(verdict.reason).toContain('trung tính');
  });

  it('chưa đủ dữ liệu → Trung lập', () => {
    expect(evaluateRsiZone(inputs, 1, P).direction).toBe('neutral');
  });
});

describe('evaluateMacdCross (R4)', () => {
  // MACD(2,3,2) trên [10,20,10,20,10]: macd = [null,null,−5/3,5/9,−25/27],
  // signal = [null,null,null,−5/9,−65/81] — tính tay ở macd.test.ts.
  // Tại index 4: macd đi từ 5/9 ≥ −5/9 xuống −75/81 < −65/81 → cắt XUỐNG, histogram −10/81 < 0.
  const inputs = computeAnalysisInputs(candlesFromCloses([10, 20, 10, 20, 10]), P);

  it('MACD cắt xuống Signal, histogram âm → Bán kèm lý do củng cố', () => {
    const verdict = evaluateMacdCross(inputs, 4, P);
    expect(verdict.direction).toBe('sell');
    expect(verdict.reason).toContain('cắt xuống');
    expect(verdict.reason).toContain('histogram âm củng cố');
  });

  it('có MACD/Signal nhưng không có giao cắt trong cửa sổ → Trung lập', () => {
    const verdict = evaluateMacdCross(inputs, 3, P);
    expect(verdict.direction).toBe('neutral');
    expect(verdict.reason).toContain('Không có giao cắt');
  });

  it('Signal chưa đủ dữ liệu → Trung lập', () => {
    expect(evaluateMacdCross(inputs, 2, P).direction).toBe('neutral');
  });
});

describe('evaluateBbTouch (R5)', () => {
  it('giá chạm băng trên (chuỗi tăng) → Bán; chạm băng dưới (chuỗi giảm) → Mua', () => {
    // BB(3,1) trên [1,2,3]: basis 2, σ = √(2/3) ≈ 0.816 → upper ≈ 2.816; close 3 ≥ upper.
    const rising = computeAnalysisInputs(candlesFromCloses([1, 2, 3]), P);
    expect(evaluateBbTouch(rising, 2, P).direction).toBe('sell');

    // BB(3,1) trên [5,4,3]: basis 4, lower ≈ 3.184; close 3 ≤ lower.
    const falling = computeAnalysisInputs(candlesFromCloses([5, 4, 3]), P);
    expect(evaluateBbTouch(falling, 2, P).direction).toBe('buy');
  });

  it('giá nằm trong dải → Trung lập', () => {
    // Cửa sổ [3,2,3]: mean 8/3, σ = √(2/9) ≈ 0.471 → dải [2.195, 3.138]; close 3 nằm trong.
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3, 2, 3]), P);
    expect(evaluateBbTouch(inputs, 4, P).direction).toBe('neutral');
  });

  it('giá đứng yên (σ = 0, hai băng trùng) → Trung lập, không thiên về phía nào', () => {
    const flat = computeAnalysisInputs(candlesFromCloses([5, 5, 5]), P);
    const verdict = evaluateBbTouch(flat, 2, P);
    expect(verdict.direction).toBe('neutral');
    expect(verdict.reason).toContain('Biên độ Bollinger bằng 0');
  });

  it('chưa đủ dữ liệu → Trung lập', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([1, 2, 3]), P);
    expect(evaluateBbTouch(inputs, 1, P).direction).toBe('neutral');
  });
});
