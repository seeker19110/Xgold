import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import { computeTradeLevels } from '@/lib/analysis/trade-levels';
import {
  DEFAULT_ANALYSIS_PARAMS,
  type AnalysisParams,
  type Suggestion,
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

const P: AnalysisParams = { ...DEFAULT_ANALYSIS_PARAMS, ichimokuDisplacement: 0 };
const base = computeAnalysisInputs(candlesFromCloses([1, 2, 3]), P);

function suggestion(
  direction: 'buy' | 'sell' | 'neutral',
  score: number,
  maxScore = 1,
): Suggestion {
  return { ts: base.ts[0] ?? '', direction, score, maxScore, signals: [] };
}

describe('computeTradeLevels', () => {
  it('Trung lập → mọi trường null', () => {
    const levels = computeTradeLevels(base, suggestion('neutral', 0), 0, P);
    expect(levels).toEqual({
      confidence: null,
      risk: null,
      riskScore: 0,
      entry: null,
      sl: null,
      tp1: null,
      tp2: null,
    });
  });

  it('Mua, đủ dữ liệu, không rủi ro → LOW, SL/TP tính tay đúng công thức', () => {
    // ratio 0.5 → confRaw 3 → confidence 50+18=68. cloud (bot100,top110): mỏng? 10 < 0.3*20=6 → false.
    // xa mây? distance close-top=115-110=5 > 2*atr=40 → false. → riskScore 0 → LOW.
    // sl = 100-0.5*20=90; riskDist=|115-90|=25; tp1=115+37.5=152.5; tp2=115+62.5=177.5.
    const inputs = {
      ...base,
      closes: [115],
      atr: [20],
      ichimoku: [{ ts: base.ts[0] ?? '', spanA: 110, spanB: 100 }],
      rsiFast: [40],
      rsi: [45],
      rsiSlow: [42],
    };
    const levels = computeTradeLevels(inputs, suggestion('buy', 0.5), 0, P);
    expect(levels.confidence).toBeCloseTo(68, 10);
    expect(levels.risk).toBe('LOW');
    expect(levels.riskScore).toBe(0);
    expect(levels.entry).toBe(115);
    expect(levels.sl).toBeCloseTo(90, 10);
    expect(levels.tp1).toBeCloseTo(152.5, 10);
    expect(levels.tp2).toBeCloseTo(177.5, 10);
  });

  it('Bán, mây mỏng + giá xa mây + RSI quá bán ngược hướng → HIGH, confidence giảm vì phân kỳ', () => {
    // ratio 0.6 → confRaw 3.6; RSI cả ba <30 (oversold) NGƯỢC hướng bán → confRaw -2 = 1.6 →
    // confidence 50+9.6=59.6. cloud (bot100,top110): mỏng vì 10 < 0.3*40=12 → true.
    // xa mây (bán) = bot-close = 100-5=95 > 2*40=80 → true. riskScore = 1+1+1 = 3 → HIGH.
    // sl = 110+0.5*40=130; riskDist=|5-130|=125; tp1=5-187.5=-182.5; tp2=5-312.5=-307.5.
    const inputs = {
      ...base,
      closes: [5],
      atr: [40],
      ichimoku: [{ ts: base.ts[0] ?? '', spanA: 110, spanB: 100 }],
      rsiFast: [25],
      rsi: [20],
      rsiSlow: [15],
    };
    const levels = computeTradeLevels(inputs, suggestion('sell', -0.6), 0, P);
    expect(levels.confidence).toBeCloseTo(59.6, 10);
    expect(levels.risk).toBe('HIGH');
    expect(levels.riskScore).toBe(3);
    expect(levels.sl).toBeCloseTo(130, 10);
    expect(levels.tp1).toBeCloseTo(-182.5, 10);
    expect(levels.tp2).toBeCloseTo(-307.5, 10);
  });

  it('Mua nhưng thiếu mây/ATR → mọi trường null kể cả confidence (F-018: nhất quán, không nửa vời)', () => {
    const inputs = { ...base, closes: [100], atr: [null] };
    const levels = computeTradeLevels(inputs, suggestion('buy', 1, 1), 0, P);
    expect(levels.confidence).toBeNull();
    expect(levels.risk).toBeNull();
    expect(levels.entry).toBeNull();
    expect(levels.sl).toBeNull();
    expect(levels.tp1).toBeNull();
    expect(levels.tp2).toBeNull();
  });
});
