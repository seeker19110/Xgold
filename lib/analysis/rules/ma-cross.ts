import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';
import { findRecentCross } from '@/lib/analysis/rules/cross';

/** R1 — Giao cắt MA: golden cross (SMA nhanh cắt lên SMA chậm) trong `maCrossLookback` nến → Mua. */
export function evaluateMaCross(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const { maFastPeriod: fast, maSlowPeriod: slow, maCrossLookback: lookback } = params;

  if (inputs.maSlow[index] === null || inputs.maSlow[index] === undefined) {
    return { direction: 'neutral', reason: `Chưa đủ dữ liệu cho SMA${slow}` };
  }

  const cross = findRecentCross(inputs.maFast, inputs.maSlow, index, lookback);
  if (!cross) {
    return {
      direction: 'neutral',
      reason: `Không có giao cắt SMA${fast}/SMA${slow} trong ${lookback} nến gần nhất`,
    };
  }

  const ago = index - cross.at;
  const agoText = ago === 0 ? 'tại nến hiện tại' : `${ago} nến trước`;
  return cross.direction === 'up'
    ? { direction: 'buy', reason: `Golden cross: SMA${fast} cắt lên SMA${slow} (${agoText})` }
    : { direction: 'sell', reason: `Death cross: SMA${fast} cắt xuống SMA${slow} (${agoText})` };
}
