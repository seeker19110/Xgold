import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';
import { findRecentCross } from '@/lib/analysis/rules/cross';

/** R4 — Giao cắt MACD: MACD line cắt lên/xuống Signal line trong `macdCrossLookback` nến. */
export function evaluateMacdCross(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const lookback = params.macdCrossLookback;
  const point = inputs.macd[index];

  if (!point || point.macd === null || point.signal === null) {
    return { direction: 'neutral', reason: 'Chưa đủ dữ liệu cho MACD' };
  }

  const macdLine = inputs.macd.map((p) => p.macd);
  const signalLine = inputs.macd.map((p) => p.signal);
  const cross = findRecentCross(macdLine, signalLine, index, lookback);
  if (!cross) {
    return {
      direction: 'neutral',
      reason: `Không có giao cắt MACD trong ${lookback} nến gần nhất`,
    };
  }

  const histogram = point.histogram;
  const ago = index - cross.at;
  const agoText = ago === 0 ? 'tại nến hiện tại' : `${ago} nến trước`;

  if (cross.direction === 'up') {
    const boost = histogram !== null && histogram > 0 ? ', histogram dương củng cố' : '';
    return { direction: 'buy', reason: `MACD cắt lên Signal (${agoText}${boost})` };
  }
  const boost = histogram !== null && histogram < 0 ? ', histogram âm củng cố' : '';
  return { direction: 'sell', reason: `MACD cắt xuống Signal (${agoText}${boost})` };
}
