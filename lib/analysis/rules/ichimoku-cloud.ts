import type { AnalysisInputs, AnalysisParams, RuleVerdict } from '@/lib/analysis/types';
import { cloudAt } from '@/lib/indicators';
import { findRecentCross } from '@/lib/analysis/rules/cross';

/**
 * R6 — Mây Ichimoku (ADR-0011): giá trên mây (đã dịch `ichimokuDisplacement` nến) → thiên Mua; giá
 * dưới mây → thiên Bán; giá trong mây → Trung lập. Màu mây và breakout gần đây chỉ làm rõ lý do,
 * không đổi hướng — mỗi quy tắc trong engine chỉ trả MỘT hướng, `combine.ts` tự cộng trọng số.
 */
export function evaluateIchimokuCloud(
  inputs: AnalysisInputs,
  index: number,
  params: AnalysisParams,
): RuleVerdict {
  const { ichimokuDisplacement: displacement, ichimokuBreakoutLookback: lookback } = params;
  const close = inputs.closes[index];
  const cloud = cloudAt(inputs.ichimoku, index, displacement);

  if (!cloud || close === undefined) {
    return { direction: 'neutral', reason: 'Chưa đủ dữ liệu cho mây Ichimoku' };
  }

  const colorText = cloud.green ? 'mây xanh' : 'mây đỏ';

  if (close > cloud.top) {
    const cloudTops = inputs.ichimoku.map(
      (_, i) => cloudAt(inputs.ichimoku, i, displacement)?.top ?? null,
    );
    const breakout = findRecentCross(inputs.closes, cloudTops, index, lookback);
    const breakoutText = breakout?.direction === 'up' ? ', vừa breakout lên khỏi mây' : '';
    return {
      direction: 'buy',
      reason: `Giá ${close.toFixed(2)} trên mây (${colorText}${breakoutText})`,
    };
  }
  if (close < cloud.bot) {
    const cloudBots = inputs.ichimoku.map(
      (_, i) => cloudAt(inputs.ichimoku, i, displacement)?.bot ?? null,
    );
    const breakout = findRecentCross(inputs.closes, cloudBots, index, lookback);
    const breakoutText = breakout?.direction === 'down' ? ', vừa breakout xuống dưới mây' : '';
    return {
      direction: 'sell',
      reason: `Giá ${close.toFixed(2)} dưới mây (${colorText}${breakoutText})`,
    };
  }
  return { direction: 'neutral', reason: `Giá ${close.toFixed(2)} nằm trong mây (${colorText})` };
}
