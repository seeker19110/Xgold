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
  return {
    ts: base.ts[0] ?? '',
    direction,
    regime: null,
    score,
    maxScore,
    norm: maxScore > 0 ? score / maxScore : 0,
    signals: [],
  };
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
      blockedReason: 'Phân loại tổng hợp Trung lập — không có mức tham chiếu',
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
    // confidence 50+9.6=59.6. cloud (bot1100,top1110): mỏng vì 10 < 0.3*40=12 → true.
    // xa mây (bán) = bot-close = 1100-1000=100 > 2*40=80 → true. riskScore = 1+1+1 = 3 → HIGH.
    // sl thô = 1110+0.5*40=1130, cách entry 130 > 3*40=120 → chặn: sl = 1000+120 = 1120.
    // riskDist=120; tp1=1000-180=820; tp2=1000-300=700.
    const inputs = {
      ...base,
      closes: [1000],
      atr: [40],
      ichimoku: [{ ts: base.ts[0] ?? '', spanA: 1110, spanB: 1100 }],
      rsiFast: [25],
      rsi: [20],
      rsiSlow: [15],
    };
    const levels = computeTradeLevels(inputs, suggestion('sell', -0.6), 0, P);
    expect(levels.confidence).toBeCloseTo(59.6, 10);
    expect(levels.risk).toBe('HIGH');
    expect(levels.riskScore).toBe(3);
    expect(levels.sl).toBeCloseTo(1120, 10);
    expect(levels.tp1).toBeCloseTo(820, 10);
    expect(levels.tp2).toBeCloseTo(700, 10);
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

  // --- Đợt A: ca tái hiện lỗi trước khi vá (đánh giá 2026-08-28) ---

  it('F-020: Mua nhưng giá NẰM DƯỚI mây → KHÔNG trả mức giao dịch (trước đây SL nằm trên entry)', () => {
    // Trước khi vá: sl = cloud.bot - 0.5*atr = 120-1 = 119 > entry 100 → lệnh Mua có SL trên giá
    // vào, TP1 128.5, mà vẫn gắn nhãn "Rủi ro THẤP, xác suất 71.6%". R6 chỉ nặng 0.15/1.0 nên 6 quy
    // tắc còn lại thừa sức đẩy score qua ngưỡng khi giá đang dưới mây.
    const inputs = {
      ...base,
      closes: [100],
      atr: [2],
      ichimoku: [{ ts: base.ts[0] ?? '', spanA: 120, spanB: 130 }],
      rsiFast: [50],
      rsi: [50],
      rsiSlow: [50],
    };
    const levels = computeTradeLevels(inputs, suggestion('buy', 0.6), 0, P);
    expect(levels.entry).toBeNull();
    expect(levels.sl).toBeNull();
    expect(levels.confidence).toBeNull();
    expect(levels.blockedReason).toContain('mây');
  });

  it('F-020: Bán nhưng giá NẰM TRÊN mây → KHÔNG trả mức giao dịch (đối xứng)', () => {
    const inputs = {
      ...base,
      closes: [200],
      atr: [2],
      ichimoku: [{ ts: base.ts[0] ?? '', spanA: 120, spanB: 130 }],
      rsiFast: [50],
      rsi: [50],
      rsiSlow: [50],
    };
    const levels = computeTradeLevels(inputs, suggestion('sell', -0.6), 0, P);
    expect(levels.entry).toBeNull();
    expect(levels.blockedReason).toContain('mây');
  });

  it('F-021: SL bị chặn ở MAX_SL_ATR_MULTIPLE × ATR nên TP không thể âm', () => {
    // Bán: cloud top 110, atr 40 → sl thô = 130, cách entry 5 tới 125 (>3×ATR=120) → chặn còn 120.
    // tp1 = 5 - 1.5*120 = -175 vẫn âm → bất biến "mọi mức > 0" chặn → không trả mức.
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
    expect(levels.entry).toBeNull();
    expect(levels.blockedReason).toContain('không hợp lệ');
  });

  it('F-021: SL xa hợp lý vẫn được chặn về 3×ATR, thứ tự entry/sl/tp luôn đúng chiều', () => {
    // Mua: entry 200, cloud (bot 100, top 110) → sl thô = 100-0.5*10 = 95, cách entry 105 > 3*10=30
    // → sl = 200-30 = 170. riskDist 30 → tp1 245, tp2 275.
    const inputs = {
      ...base,
      closes: [200],
      atr: [10],
      ichimoku: [{ ts: base.ts[0] ?? '', spanA: 110, spanB: 100 }],
      rsiFast: [50],
      rsi: [50],
      rsiSlow: [50],
    };
    const levels = computeTradeLevels(inputs, suggestion('buy', 0.5), 0, P);
    expect(levels.sl).toBeCloseTo(170, 10);
    expect(levels.tp1).toBeCloseTo(245, 10);
    expect(levels.tp2).toBeCloseTo(275, 10);
    expect(levels.sl!).toBeLessThan(levels.entry!);
    expect(levels.entry!).toBeLessThan(levels.tp1!);
    expect(levels.tp1!).toBeLessThan(levels.tp2!);
  });
});
