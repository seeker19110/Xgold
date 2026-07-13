import { cloudAt } from '@/lib/indicators';
import type { AnalysisInputs, AnalysisParams, Suggestion } from '@/lib/analysis/types';

/** Mức rủi ro tham khảo (không phải rủi ro tài chính đã kiểm định) — ADR-0011. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Mức tham chiếu giao dịch suy ra từ mây Ichimoku + ATR (ADR-0011 — LẬT LẠI ranh giới "không
 * entry/SL/TP" của ADR-0007/0010). Công thức PHỎNG THEO (không port nguyên văn) đặc tả Pine Script
 * gốc: "xác suất" dùng tỷ lệ `|score|/maxScore` sẵn có của engine trọng số thay vì biến `total` rời
 * rạc của Pine (không tồn tại trong kiến trúc hiện có). Mọi trường `null` khi `direction` Trung lập
 * hoặc thiếu dữ liệu (mây/ATR chưa đủ nến) — không đoán. Xem `AnalysisDisclaimer` cho ranh giới sử
 * dụng: đây KHÔNG phải lời khuyên đầu tư, chưa qua backtest.
 */
export interface TradeLevels {
  /** 50–95, `null` khi Trung lập hoặc thiếu dữ liệu để tính. */
  confidence: number | null;
  risk: RiskLevel | null;
  riskScore: number;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
}

const EMPTY_LEVELS: TradeLevels = {
  confidence: null,
  risk: null,
  riskScore: 0,
  entry: null,
  sl: null,
  tp1: null,
  tp2: null,
};

function isNum(v: number | null | undefined): v is number {
  return v !== null && v !== undefined;
}

export function computeTradeLevels(
  inputs: AnalysisInputs,
  suggestion: Suggestion,
  index: number,
  params: AnalysisParams,
): TradeLevels {
  if (suggestion.direction === 'neutral') return EMPTY_LEVELS;

  const isBuy = suggestion.direction === 'buy';
  const close = inputs.closes[index];
  const atr14 = inputs.atr[index];
  const cloud = cloudAt(inputs.ichimoku, index, params.ichimokuDisplacement);
  const r10 = inputs.rsiFast[index];
  const r14 = inputs.rsi[index];
  const r21 = inputs.rsiSlow[index];

  const ratio = suggestion.maxScore > 0 ? Math.abs(suggestion.score) / suggestion.maxScore : 0;
  const rsiValid = isNum(r10) && isNum(r14) && isNum(r21);
  const allOverbought = rsiValid && r10 > 70 && r14 > 70 && r21 > 70;
  const allOversold = rsiValid && r10 < 30 && r14 < 30 && r21 < 30;
  const extremeAligned = isBuy ? allOversold : allOverbought;
  const extremeAgainst = isBuy ? allOverbought : allOversold;

  let confRaw = ratio * 6;
  if (extremeAligned) confRaw += 1;
  if (extremeAgainst) confRaw -= 2;
  const confidence = Math.min(Math.max(50 + confRaw * 6, 50), 95);

  if (!cloud || !isNum(atr14) || close === undefined) {
    return { ...EMPTY_LEVELS, confidence };
  }

  const thinCloud = cloud.top - cloud.bot < 0.3 * atr14;
  const distance = isBuy ? close - cloud.top : cloud.bot - close;
  const farFromCloud = distance > 2 * atr14;
  const riskScore = (thinCloud ? 1 : 0) + (farFromCloud ? 1 : 0) + (extremeAgainst ? 1 : 0);
  const risk: RiskLevel = riskScore === 0 ? 'LOW' : riskScore === 1 ? 'MEDIUM' : 'HIGH';

  const sl = isBuy ? cloud.bot - 0.5 * atr14 : cloud.top + 0.5 * atr14;
  const riskDist = Math.abs(close - sl);
  const tp1 = isBuy ? close + 1.5 * riskDist : close - 1.5 * riskDist;
  const tp2 = isBuy ? close + 2.5 * riskDist : close - 2.5 * riskDist;

  return { confidence, risk, riskScore, entry: close, sl, tp1, tp2 };
}
