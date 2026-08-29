import type { AnalysisInputs, AnalysisParams, RuleId } from '@/lib/analysis/types';

/** Chế độ thị trường — quyết định nhóm quy tắc nào đáng tin ở thời điểm đó. */
export type MarketRegime = 'trend' | 'range';

/**
 * Nhóm quy tắc theo BẢN CHẤT tín hiệu. Hai mục đích:
 * 1. Chống đếm trùng bằng chứng — các quy tắc cùng nhóm đo gần như cùng một hiện tượng
 *    (vd `price-vs-ma` và `ichimoku-cloud` đều là "giá đứng phía nào so với vùng giá trị").
 * 2. Cho phép đổi trọng số theo chế độ thị trường — hồi quy trung bình chỉ đáng tin khi đi ngang.
 */
export type RuleFamily = 'trend' | 'momentum';

export const RULE_FAMILY: Record<RuleId, RuleFamily> = {
  'ma-cross': 'trend',
  'price-vs-ma': 'trend',
  'ichimoku-cloud': 'trend',
  'rsi-stack': 'momentum',
};

export interface RegimeAssessment {
  regime: MarketRegime;
  /** Kaufman Efficiency Ratio ∈ [0,1]: 0 = đi ngang/nhiễu thuần, 1 = đi một mạch một chiều. */
  efficiencyRatio: number;
  reason: string;
}

/**
 * Kaufman Efficiency Ratio: |thay đổi ròng| / tổng |thay đổi từng nến| trong `lookback` nến.
 * Không thứ nguyên, bị chặn trong [0,1], không cần chuẩn hoá theo ATR — đo đúng thứ cần biết:
 * giá đang ĐI đâu đó hay chỉ dao động tại chỗ. `null` khi chưa đủ nến.
 */
export function efficiencyRatio(
  closes: readonly number[],
  index: number,
  lookback: number,
): number | null {
  if (lookback < 1 || index < lookback) return null;
  const start = closes[index - lookback];
  const end = closes[index];
  if (start === undefined || end === undefined) return null;

  let path = 0;
  for (let j = index - lookback + 1; j <= index; j++) {
    const cur = closes[j];
    const prev = closes[j - 1];
    if (cur === undefined || prev === undefined) return null;
    path += Math.abs(cur - prev);
  }
  // Giá đứng yên tuyệt đối: không có đường đi → không kết luận được, coi như nhiễu (0).
  if (path === 0) return 0;
  return Math.abs(end - start) / path;
}

/** Chưa đủ nến để đo → coi là `range` (bảo thủ: không cho nhóm thuận xu hướng ưu thế khi chưa biết). */
export function detectRegime(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RegimeAssessment {
  const er = efficiencyRatio(inputs.closes, index, params.regimeLookback);
  if (er === null) {
    return {
      regime: 'range',
      efficiencyRatio: 0,
      reason: `Chưa đủ ${params.regimeLookback} nến để đo chế độ thị trường`,
    };
  }
  const isTrend = er >= params.regimeTrendThreshold;
  return {
    regime: isTrend ? 'trend' : 'range',
    efficiencyRatio: er,
    reason: `Hiệu suất đường đi ${er.toFixed(2)} ${isTrend ? '≥' : '<'} ngưỡng ${params.regimeTrendThreshold} (${params.regimeLookback} nến)`,
  };
}

/**
 * Hệ số nhân trọng số theo chế độ: khi đi ngang, quy tắc thuận xu hướng hay bị cưa nên bị hạ.
 * Đây là heuristic có chủ đích — đo lại bằng `walkForward` khi có dữ liệu thật.
 *
 * Nhóm `mean-reversion` đã biến mất cùng `rsi-zone`/`bb-touch` (ADR-0015). Nếu sau này thêm lại một
 * quy tắc hồi quy trung bình thì phải khôi phục cả nhóm lẫn hệ số của nó (bản cũ: trend 0.4 /
 * range 1.5).
 */
export const REGIME_FAMILY_MULTIPLIER: Record<MarketRegime, Record<RuleFamily, number>> = {
  trend: { trend: 1.2, momentum: 1 },
  range: { trend: 0.6, momentum: 1 },
};

/**
 * Hệ số chiết khấu bằng chứng trùng lặp trong cùng một nhóm: quy tắc nặng nhất giữ nguyên trọng
 * số, phần còn lại chỉ tính một nửa. Ba quy tắc xu hướng cùng nói "Mua" vì CÙNG một lý do không
 * phải là ba bằng chứng độc lập.
 */
export const REDUNDANCY_FACTOR = 0.5;
