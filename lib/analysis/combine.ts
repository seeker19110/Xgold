import type { Candle } from '@/lib/candles/types';
import type { AnalysisConfig } from '@/lib/analysis/config';
import {
  DEFAULT_ANALYSIS_PARAMS,
  RULE_IDS,
  type AnalysisInputs,
  type AnalysisParams,
  type RuleId,
  type RuleSignal,
  type RuleVerdict,
  type SignalDirection,
  type SignalEvent,
  type Suggestion,
} from '@/lib/analysis/types';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import { evaluateMaCross } from '@/lib/analysis/rules/ma-cross';
import { evaluatePriceVsMa } from '@/lib/analysis/rules/price-vs-ma';
import { evaluateRsiZone } from '@/lib/analysis/rules/rsi-zone';
import { evaluateMacdCross } from '@/lib/analysis/rules/macd-cross';
import { evaluateBbTouch } from '@/lib/analysis/rules/bb-touch';
import { evaluateIchimokuCloud } from '@/lib/analysis/rules/ichimoku-cloud';
import { evaluateRsiStack } from '@/lib/analysis/rules/rsi-stack';
import {
  detectRegime,
  REDUNDANCY_FACTOR,
  REGIME_FAMILY_MULTIPLIER,
  RULE_FAMILY,
  type RuleFamily,
} from '@/lib/analysis/regime';

type RuleEvaluator = (inputs: AnalysisInputs, index: number, params: AnalysisParams) => RuleVerdict;

const EVALUATORS: Record<RuleId, RuleEvaluator> = {
  'ma-cross': evaluateMaCross,
  'price-vs-ma': evaluatePriceVsMa,
  'rsi-zone': evaluateRsiZone,
  'macd-cross': evaluateMacdCross,
  'bb-touch': evaluateBbTouch,
  'ichimoku-cloud': evaluateIchimokuCloud,
  'rsi-stack': evaluateRsiStack,
};

const DIRECTION_VALUE: Record<SignalDirection, number> = { buy: 1, sell: -1, neutral: 0 };

interface FamilyBucket {
  /** Tổng có dấu trong nhóm: Mua = +weight, Bán = −weight. */
  signed: number;
  /** Tổng trọng số các quy tắc đang bật trong nhóm. */
  total: number;
  /** Trọng số lớn nhất trong nhóm — phần "bằng chứng gốc" không bị chiết khấu. */
  max: number;
}

/**
 * Trọng số hiệu dụng của một nhóm sau khi chiết khấu bằng chứng trùng lặp: quy tắc nặng nhất giữ
 * nguyên, phần còn lại chỉ tính `REDUNDANCY_FACTOR`. Ba quy tắc xu hướng cùng nói "Mua" vì cùng
 * một lý do không phải ba bằng chứng độc lập (khiếm khuyết B3 — đánh giá 2026-08-28).
 */
function effectiveFamilyWeight(bucket: FamilyBucket): number {
  return bucket.max + REDUNDANCY_FACTOR * (bucket.total - bucket.max);
}

/**
 * Tổng hợp có trọng số các quy tắc ĐANG BẬT tại nến `index`. Quy tắc thiếu dữ liệu tự trả
 * trung tính (đóng góp 0) — |score| chỉ có thể giảm khi thiếu dữ liệu, không bao giờ "đoán".
 *
 * Hai chế độ (`config.combineMode`):
 * - `linear` — cộng thẳng weight × hướng như v1.
 * - `grouped` (mặc định) — gộp theo nhóm quy tắc, chiết khấu bằng chứng trùng lặp trong nhóm, và
 *   (khi `regimeAware`) nhân trọng số nhóm theo chế độ thị trường đo bằng Efficiency Ratio.
 *
 * Cả hai chế độ đều giữ `score/maxScore ∈ [−1, 1]`, nên ngưỡng `buyThreshold` và bảng hiệu chuẩn
 * xác suất (`calibration.ts`) dùng chung được cho cả hai.
 */
export function evaluateAt(
  inputs: AnalysisInputs,
  config: AnalysisConfig,
  index: number,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
): Suggestion {
  const ts = inputs.ts[index];
  if (ts === undefined) throw new Error(`index ${index} ngoài phạm vi dữ liệu`);

  const signals: RuleSignal[] = [];
  const buckets = new Map<RuleFamily, FamilyBucket>();
  let linearScore = 0;
  let linearMax = 0;

  for (const ruleId of RULE_IDS) {
    const setting = config.rules[ruleId];
    if (!setting.enabled) continue;

    const verdict = EVALUATORS[ruleId](inputs, index, params);
    signals.push({ ruleId, weight: setting.weight, ...verdict });
    linearScore += DIRECTION_VALUE[verdict.direction] * setting.weight;
    linearMax += setting.weight;

    const family = RULE_FAMILY[ruleId];
    const bucket = buckets.get(family) ?? { signed: 0, total: 0, max: 0 };
    bucket.signed += DIRECTION_VALUE[verdict.direction] * setting.weight;
    bucket.total += setting.weight;
    bucket.max = Math.max(bucket.max, setting.weight);
    buckets.set(family, bucket);
  }

  let score = linearScore;
  let maxScore = linearMax;
  let regime = null;

  if (config.combineMode === 'grouped') {
    const assessment = detectRegime(inputs, index, params);
    regime = config.regimeAware ? assessment : null;
    const multipliers = REGIME_FAMILY_MULTIPLIER[assessment.regime];

    score = 0;
    maxScore = 0;
    for (const [family, bucket] of buckets) {
      if (bucket.total <= 0) continue;
      // Đồng thuận trong nhóm ∈ [−1, 1]; nhóm cãi nhau thì triệt tiêu lẫn nhau.
      const consensus = bucket.signed / bucket.total;
      const weight = effectiveFamilyWeight(bucket) * (config.regimeAware ? multipliers[family] : 1);
      score += consensus * weight;
      maxScore += weight;
    }
  }

  const direction: SignalDirection =
    maxScore > 0 && score >= config.buyThreshold * maxScore
      ? 'buy'
      : maxScore > 0 && score <= -config.buyThreshold * maxScore
        ? 'sell'
        : 'neutral';

  return { ts, direction, regime, score, maxScore, signals };
}

/** Gợi ý tại nến gần nhất (nến đã đóng cuối cùng của dữ liệu) — `null` nếu chưa có nến nào. */
export function suggestLatest(
  candles: readonly Candle[],
  config: AnalysisConfig,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
): Suggestion | null {
  if (candles.length === 0) return null;
  const inputs = computeAnalysisInputs(candles, params);
  return evaluateAt(inputs, config, candles.length - 1, params);
}

/**
 * Các thời điểm phân loại tổng hợp CHUYỂN sang Mua/Bán trong toàn lịch sử (markers + backtest).
 * Mỗi nến chỉ dùng dữ liệu ≤ nến đó (không nhìn tương lai) — cùng `evaluateAt` với gợi ý hiện tại.
 */
export function signalEvents(
  candles: readonly Candle[],
  config: AnalysisConfig,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
): SignalEvent[] {
  const inputs = computeAnalysisInputs(candles, params);
  const events: SignalEvent[] = [];
  let prev: SignalDirection = 'neutral';

  for (let i = 0; i < candles.length; i++) {
    const { ts, direction, score } = evaluateAt(inputs, config, i, params);
    if (direction !== prev && direction !== 'neutral') {
      events.push({ ts, direction, score });
    }
    prev = direction;
  }

  return events;
}
