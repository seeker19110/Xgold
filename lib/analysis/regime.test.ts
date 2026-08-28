import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import { detectRegime, efficiencyRatio, RULE_FAMILY } from '@/lib/analysis/regime';
import { DEFAULT_ANALYSIS_PARAMS, RULE_IDS, type AnalysisParams } from '@/lib/analysis/types';

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

describe('efficiencyRatio', () => {
  it('đi một mạch một chiều → 1 (đường đi bằng đúng thay đổi ròng)', () => {
    // [10,11,12,13]: ròng = 3, đường đi = 1+1+1 = 3 → 1.
    expect(efficiencyRatio([10, 11, 12, 13], 3, 3)).toBeCloseTo(1, 12);
  });

  it('dao động rồi về chỗ cũ → 0 (ròng = 0)', () => {
    // [10,12,10,12,10]: ròng = 0, đường đi = 8 → 0.
    expect(efficiencyRatio([10, 12, 10, 12, 10], 4, 4)).toBeCloseTo(0, 12);
  });

  it('nửa đường nhiễu → tỷ lệ tính tay đúng', () => {
    // [10,12,11,13]: ròng = 3, đường đi = 2+1+2 = 5 → 0.6.
    expect(efficiencyRatio([10, 12, 11, 13], 3, 3)).toBeCloseTo(0.6, 12);
  });

  it('giá đứng yên tuyệt đối → 0, không chia 0', () => {
    expect(efficiencyRatio([10, 10, 10], 2, 2)).toBe(0);
  });

  it('chưa đủ nến → null (không đoán)', () => {
    expect(efficiencyRatio([10, 11], 1, 5)).toBeNull();
    expect(efficiencyRatio([10, 11, 12], 2, 0)).toBeNull();
  });
});

describe('detectRegime', () => {
  const P: AnalysisParams = {
    ...DEFAULT_ANALYSIS_PARAMS,
    regimeLookback: 4,
    regimeTrendThreshold: 0.3,
  };

  it('chuỗi tăng đều → trend, ER = 1', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([10, 11, 12, 13, 14]), P);
    const r = detectRegime(inputs, 4, P);
    expect(r.regime).toBe('trend');
    expect(r.efficiencyRatio).toBeCloseTo(1, 12);
  });

  it('chuỗi dao động quanh một mức → range', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([10, 12, 10, 12, 10]), P);
    expect(detectRegime(inputs, 4, P).regime).toBe('range');
  });

  it('chưa đủ nến → range (bảo thủ) và nói rõ lý do', () => {
    const inputs = computeAnalysisInputs(candlesFromCloses([10, 11]), P);
    const r = detectRegime(inputs, 1, P);
    expect(r.regime).toBe('range');
    expect(r.reason).toContain('Chưa đủ');
  });
});

describe('RULE_FAMILY', () => {
  it('mọi quy tắc đều được xếp nhóm (không sót khi thêm quy tắc mới)', () => {
    for (const id of RULE_IDS) expect(RULE_FAMILY[id]).toBeDefined();
  });
});
