import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';

/** R3 — Vùng RSI: dưới ngưỡng quá bán → thiên Mua; trên ngưỡng quá mua → thiên Bán. */
export function evaluateRsiZone(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const { rsiPeriod: period, rsiOversold: oversold, rsiOverbought: overbought } = params;
  const value = inputs.rsi[index];

  if (value === null || value === undefined) {
    return { direction: 'neutral', reason: `Chưa đủ dữ liệu cho RSI(${period})` };
  }

  if (value < oversold) {
    return {
      direction: 'buy',
      reason: `RSI(${period}) = ${value.toFixed(1)} < ${oversold} — vùng quá bán`,
    };
  }
  if (value > overbought) {
    return {
      direction: 'sell',
      reason: `RSI(${period}) = ${value.toFixed(1)} > ${overbought} — vùng quá mua`,
    };
  }
  return {
    direction: 'neutral',
    reason: `RSI(${period}) = ${value.toFixed(1)} trong vùng trung tính (${oversold}–${overbought})`,
  };
}
