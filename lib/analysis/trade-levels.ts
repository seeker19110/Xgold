import { cloudAt } from '@/lib/indicators';
import type { AnalysisInputs, AnalysisParams, Suggestion } from '@/lib/analysis/types';

/** Mức rủi ro tham khảo (không phải rủi ro tài chính đã kiểm định) — ADR-0011. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Hằng số của công thức mức tham chiếu — phỏng theo đặc tả Pine gốc (ADR-0011). Tách tên rõ ràng
 * thay vì rải số trong biểu thức (CLAUDE.md §3.4); mọi giá trị dưới đây là **heuristic chưa hiệu
 * chuẩn** ở đợt này — `lib/analysis/calibration.ts` mới là nguồn xác suất thực nghiệm.
 */
const CONFIDENCE_FLOOR = 50;
/** Biên độ tối đa mà tỷ lệ đồng thuận (`|score|/maxScore` ∈ [0,1]) đóng góp cho confidence. */
const CONFIDENCE_RATIO_SPAN = 36;
/** Cộng thêm khi cả ba RSI cùng ở vùng cực trị THUẬN hướng lệnh. */
const CONFIDENCE_ALIGNED_BONUS = 6;
/** Trừ đi khi cả ba RSI cùng ở vùng cực trị NGƯỢC hướng lệnh (phân kỳ). */
const CONFIDENCE_AGAINST_PENALTY = 12;
/**
 * Trần danh nghĩa. Trần **đạt được thực tế** là 92 (ratio = 1 cộng bonus) — dải hiển thị thật là
 * 50–92; con số này chỉ chặn trên phòng khi hằng số phía trên thay đổi.
 */
const CONFIDENCE_CAP = 95;
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;
/** Mây mỏng hơn ngần này × ATR → cấu trúc yếu, cộng 1 điểm rủi ro. */
const THIN_CLOUD_ATR_MULTIPLE = 0.3;
/** Giá xa mây hơn ngần này × ATR → đã đi quá đà, cộng 1 điểm rủi ro. */
const FAR_FROM_CLOUD_ATR_MULTIPLE = 2;
/** Đệm dưới/trên biên mây khi đặt SL. */
const SL_CLOUD_BUFFER_ATR_MULTIPLE = 0.5;
/**
 * Trần khoảng cách SL tính theo ATR (F-021). Khi giá chạy rất xa mây, SL neo vào biên mây có thể
 * cách entry hàng chục lần ATR → R quá lớn, TP xa vô nghĩa (thậm chí ra giá âm). Chặn ở đây.
 */
const MAX_SL_ATR_MULTIPLE = 3;
/** Bội số R của TP — export để `labeling.ts` neo lại đúng công thức khi vào lệnh ở nến kế. */
export const TP1_R_MULTIPLE = 1.5;
export const TP2_R_MULTIPLE = 2.5;

/**
 * Mức tham chiếu giao dịch suy ra từ mây Ichimoku + ATR (ADR-0011 — LẬT LẠI ranh giới "không
 * entry/SL/TP" của ADR-0007/0010). Công thức PHỎNG THEO (không port nguyên văn) đặc tả Pine Script
 * gốc: "xác suất" dùng tỷ lệ `|score|/maxScore` sẵn có của engine trọng số thay vì biến `total` rời
 * rạc của Pine (không tồn tại trong kiến trúc hiện có). Mọi trường `null` khi không đủ điều kiện —
 * `blockedReason` nói rõ vì sao, không đoán. Xem `AnalysisDisclaimer` cho ranh giới sử dụng: đây
 * KHÔNG phải lời khuyên đầu tư.
 */
export interface TradeLevels {
  /** 50–92 trên thực tế (trần danh nghĩa 95), `null` khi không trả được mức. */
  confidence: number | null;
  risk: RiskLevel | null;
  riskScore: number;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  /** Lý do không trả mức tham chiếu; `null` khi trả đủ mức. */
  blockedReason: string | null;
}

function blocked(reason: string): TradeLevels {
  return {
    confidence: null,
    risk: null,
    riskScore: 0,
    entry: null,
    sl: null,
    tp1: null,
    tp2: null,
    blockedReason: reason,
  };
}

function isNum(v: number | null | undefined): v is number {
  return v !== null && v !== undefined;
}

export function computeTradeLevels(
  inputs: AnalysisInputs,
  suggestion: Suggestion,
  index: number,
  params: AnalysisParams,
): TradeLevels {
  if (suggestion.direction === 'neutral') {
    return blocked('Phân loại tổng hợp Trung lập — không có mức tham chiếu');
  }

  const isBuy = suggestion.direction === 'buy';
  const close = inputs.closes[index];
  const atr14 = inputs.atr[index];
  const cloud = cloudAt(inputs.ichimoku, index, params.ichimokuDisplacement);

  // Mây/ATR/close chưa đủ dữ liệu → mọi trường null, kể cả confidence (không tính "một nửa kết
  // quả" — confidence riêng lẻ không có entry/SL/TP đi kèm gây hiểu lầm là gợi ý dùng được).
  if (!cloud || !isNum(atr14) || close === undefined) {
    return blocked('Chưa đủ dữ liệu mây Ichimoku/ATR để tính mức tham chiếu');
  }
  if (atr14 <= 0) return blocked('ATR bằng 0 — không đo được biên độ để đặt SL/TP');

  // F-020: SL neo vào biên mây CHỈ có nghĩa khi giá đã ở đúng phía mây so với hướng lệnh. Hướng
  // tổng hợp đến từ 6 quy tắc, R6 (mây) chỉ nặng 0.1875/1.0 — 5 quy tắc còn lại thừa sức đẩy score
  // qua ngưỡng khi giá đang ở phía ngược lại. Khi đó công thức cũ cho SL nằm SAI PHÍA entry (lệnh
  // Mua có SL trên giá vào). Không "sửa" bằng cách đảo dấu — cấu trúc mâu thuẫn thì không đưa mức.
  const aligned = isBuy ? close > cloud.top : close < cloud.bot;
  if (!aligned) {
    const side = isBuy ? 'chưa vượt lên trên' : 'chưa xuống dưới';
    return blocked(`Hướng ${isBuy ? 'Mua' : 'Bán'} mâu thuẫn cấu trúc: giá ${side} mây Ichimoku`);
  }

  const r10 = inputs.rsiFast[index];
  const r14 = inputs.rsi[index];
  const r21 = inputs.rsiSlow[index];

  const ratio = suggestion.maxScore > 0 ? Math.abs(suggestion.score) / suggestion.maxScore : 0;
  const rsiValid = isNum(r10) && isNum(r14) && isNum(r21);
  const allOverbought =
    rsiValid && r10 > RSI_OVERBOUGHT && r14 > RSI_OVERBOUGHT && r21 > RSI_OVERBOUGHT;
  const allOversold = rsiValid && r10 < RSI_OVERSOLD && r14 < RSI_OVERSOLD && r21 < RSI_OVERSOLD;
  const extremeAligned = isBuy ? allOversold : allOverbought;
  const extremeAgainst = isBuy ? allOverbought : allOversold;

  let confRaw = CONFIDENCE_FLOOR + ratio * CONFIDENCE_RATIO_SPAN;
  if (extremeAligned) confRaw += CONFIDENCE_ALIGNED_BONUS;
  if (extremeAgainst) confRaw -= CONFIDENCE_AGAINST_PENALTY;
  const confidence = Math.min(Math.max(confRaw, CONFIDENCE_FLOOR), CONFIDENCE_CAP);

  const thinCloud = cloud.top - cloud.bot < THIN_CLOUD_ATR_MULTIPLE * atr14;
  // Đã qua cổng `aligned` nên khoảng cách này luôn ≥ 0 — đo đúng độ "đi quá đà" khỏi mây.
  const distance = isBuy ? close - cloud.top : cloud.bot - close;
  const farFromCloud = distance > FAR_FROM_CLOUD_ATR_MULTIPLE * atr14;
  const riskScore = (thinCloud ? 1 : 0) + (farFromCloud ? 1 : 0) + (extremeAgainst ? 1 : 0);
  const risk: RiskLevel = riskScore === 0 ? 'LOW' : riskScore === 1 ? 'MEDIUM' : 'HIGH';

  const slRaw = isBuy
    ? cloud.bot - SL_CLOUD_BUFFER_ATR_MULTIPLE * atr14
    : cloud.top + SL_CLOUD_BUFFER_ATR_MULTIPLE * atr14;
  const riskDist = Math.min(Math.abs(close - slRaw), MAX_SL_ATR_MULTIPLE * atr14);
  const sl = isBuy ? close - riskDist : close + riskDist;
  const tp1 = isBuy ? close + TP1_R_MULTIPLE * riskDist : close - TP1_R_MULTIPLE * riskDist;
  const tp2 = isBuy ? close + TP2_R_MULTIPLE * riskDist : close - TP2_R_MULTIPLE * riskDist;

  // Bất biến cuối: đúng thứ tự theo hướng lệnh và mọi mức là giá dương. Vi phạm → không trả mức
  // (thà thiếu còn hơn đưa mức vô nghĩa cho người đang cân nhắc vào lệnh thật).
  const ordered = isBuy
    ? sl < close && close < tp1 && tp1 < tp2
    : sl > close && close > tp1 && tp1 > tp2;
  if (!ordered || !(sl > 0 && tp1 > 0 && tp2 > 0)) {
    return blocked('Mức tham chiếu tính ra không hợp lệ (thứ tự hoặc giá không dương)');
  }

  return { confidence, risk, riskScore, entry: close, sl, tp1, tp2, blockedReason: null };
}
