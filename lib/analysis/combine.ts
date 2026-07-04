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

type RuleEvaluator = (inputs: AnalysisInputs, index: number, params: AnalysisParams) => RuleVerdict;

const EVALUATORS: Record<RuleId, RuleEvaluator> = {
  'ma-cross': evaluateMaCross,
  'price-vs-ma': evaluatePriceVsMa,
  'rsi-zone': evaluateRsiZone,
  'macd-cross': evaluateMacdCross,
  'bb-touch': evaluateBbTouch,
};

const DIRECTION_VALUE: Record<SignalDirection, number> = { buy: 1, sell: -1, neutral: 0 };

/**
 * Tổng hợp có trọng số các quy tắc ĐANG BẬT tại nến `index`. Quy tắc thiếu dữ liệu tự trả
 * trung tính (đóng góp 0) — |score| chỉ có thể giảm khi thiếu dữ liệu, không bao giờ "đoán".
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
  let score = 0;
  let maxScore = 0;

  for (const ruleId of RULE_IDS) {
    const setting = config.rules[ruleId];
    if (!setting.enabled) continue;

    const verdict = EVALUATORS[ruleId](inputs, index, params);
    signals.push({ ruleId, weight: setting.weight, ...verdict });
    score += DIRECTION_VALUE[verdict.direction] * setting.weight;
    maxScore += setting.weight;
  }

  const direction: SignalDirection =
    score >= config.buyThreshold ? 'buy' : score <= -config.buyThreshold ? 'sell' : 'neutral';

  return { ts, direction, score, maxScore, signals };
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
