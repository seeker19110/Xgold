import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';

/** R5 — Chạm băng Bollinger: chạm/đâm băng dưới → thiên Mua (hồi về trung bình); băng trên → Bán. */
export function evaluateBbTouch(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const { bbPeriod: period, bbMultiplier: multiplier } = params;
  const point = inputs.bb[index];
  const close = inputs.closes[index];

  if (!point || point.upper === null || point.lower === null || close === undefined) {
    return { direction: 'neutral', reason: `Chưa đủ dữ liệu cho BB(${period}, ${multiplier})` };
  }

  // Giá đứng yên → σ = 0 → hai băng trùng nhau: mọi giá đều "chạm cả hai băng" — không có tín
  // hiệu có nghĩa, trả trung tính thay vì thiên về một phía tùy thứ tự so sánh.
  if (point.upper === point.lower) {
    return { direction: 'neutral', reason: 'Biên độ Bollinger bằng 0 (giá đứng yên)' };
  }

  if (close <= point.lower) {
    return {
      direction: 'buy',
      reason: `Giá ${close.toFixed(2)} chạm băng dưới BB (${point.lower.toFixed(2)})`,
    };
  }
  if (close >= point.upper) {
    return {
      direction: 'sell',
      reason: `Giá ${close.toFixed(2)} chạm băng trên BB (${point.upper.toFixed(2)})`,
    };
  }
  return { direction: 'neutral', reason: 'Giá nằm trong dải Bollinger' };
}
