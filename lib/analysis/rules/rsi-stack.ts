import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';

/**
 * R7 — Xếp chồng RSI (Seeker-RSI, ADR-0011): RSI nhanh/giữa/chậm (mặc định 10/14/21) xếp tăng dần
 * → thiên Mua; xếp giảm dần → thiên Bán; không xếp chồng rõ → Trung lập. Ghi chú thêm khi cả ba
 * cùng ở vùng quá mua/quá bán (thông tin bổ sung, không đổi hướng).
 */
export function evaluateRsiStack(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const { rsiStackFastPeriod: fast, rsiStackSlowPeriod: slow, rsiPeriod: mid } = params;
  const r10 = inputs.rsiFast[index];
  const r14 = inputs.rsi[index];
  const r21 = inputs.rsiSlow[index];

  if (
    r10 === null ||
    r10 === undefined ||
    r14 === null ||
    r14 === undefined ||
    r21 === null ||
    r21 === undefined
  ) {
    return { direction: 'neutral', reason: `Chưa đủ dữ liệu cho RSI ${fast}/${mid}/${slow}` };
  }

  const extreme =
    r10 > 70 && r14 > 70 && r21 > 70
      ? ' (cả ba quá mua)'
      : r10 < 30 && r14 < 30 && r21 < 30
        ? ' (cả ba quá bán)'
        : '';

  if (r10 > r14 && r14 > r21) {
    return {
      direction: 'buy',
      reason: `RSI xếp chồng tăng dần ${r10.toFixed(1)}>${r14.toFixed(1)}>${r21.toFixed(1)}${extreme}`,
    };
  }
  if (r10 < r14 && r14 < r21) {
    return {
      direction: 'sell',
      reason: `RSI xếp chồng giảm dần ${r10.toFixed(1)}<${r14.toFixed(1)}<${r21.toFixed(1)}${extreme}`,
    };
  }
  return { direction: 'neutral', reason: 'RSI 10/14/21 chưa xếp chồng rõ hướng' };
}
