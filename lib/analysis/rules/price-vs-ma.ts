import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';

/** R2 — Xu hướng nền: giá đóng cửa so với SMA chậm (lọc xu hướng, không tự phát lệnh). */
export function evaluatePriceVsMa(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const period = params.maSlowPeriod;
  const ma = inputs.maSlow[index];
  const close = inputs.closes[index];

  if (ma === null || ma === undefined || close === undefined) {
    return { direction: 'neutral', reason: `Chưa đủ dữ liệu cho SMA${period}` };
  }

  if (close > ma) {
    return {
      direction: 'buy',
      reason: `Giá ${close.toFixed(2)} trên SMA${period} (${ma.toFixed(2)}) — xu hướng tăng`,
    };
  }
  if (close < ma) {
    return {
      direction: 'sell',
      reason: `Giá ${close.toFixed(2)} dưới SMA${period} (${ma.toFixed(2)}) — xu hướng giảm`,
    };
  }
  return { direction: 'neutral', reason: `Giá đúng bằng SMA${period}` };
}
