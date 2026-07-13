import type { Candle, Timeframe } from '@/lib/candles/types';
import { suggestLatest } from '@/lib/analysis/combine';
import type { AnalysisConfig } from '@/lib/analysis/config';
import type { AnalysisParams, SignalDirection, Suggestion } from '@/lib/analysis/types';

/** Khung tham gia hợp lưu — thứ tự hiển thị trên UI (Đợt 10, mục 2.1). */
export const CONFLUENCE_TIMEFRAMES: readonly Timeframe[] = ['1h', '4h', '1D', '1W'];

/** Ngưỡng phân loại tổng hợp trên điểm chuẩn hoá trung bình (dải −1..+1). */
export const CONFLUENCE_THRESHOLD = 0.25;

export interface TimeframeVerdict {
  timeframe: Timeframe;
  /** `null` nếu khung đó không đủ nến (mảng rỗng truyền vào). */
  suggestion: Suggestion | null;
  /** `score/maxScore` (0 nếu `maxScore` = 0 hoặc `suggestion` null) — dải chuẩn hoá −1..+1. */
  norm: number;
}

export interface Confluence {
  perTimeframe: TimeframeVerdict[];
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  /** Trung bình `norm` trên các khung CÓ suggestion (bỏ qua khung null). 0 nếu không khung nào có. */
  meanNorm: number;
  overall: SignalDirection;
}

/**
 * Hợp lưu tín hiệu đa khung (1h/4h/1D/1W) từ engine `suggestLatest` sẵn có — không tính lại chỉ báo,
 * chỉ tổng hợp kết quả từng khung theo điểm chuẩn hoá `score/maxScore` (Đợt 10, mục 2.1).
 *
 * @param candlesByTimeframe nến đã chuẩn bị cho từng khung (1h/4h/1D/1W). Khung thiếu → mảng rỗng
 *   (hoặc bỏ khoá) — được coi là "không đủ nến", không nhìn tương lai vì mỗi khung tự
 *   `suggestLatest` trên đúng dữ liệu của nó.
 */
export function computeConfluence(
  candlesByTimeframe: Partial<Record<Timeframe, readonly Candle[]>>,
  config: AnalysisConfig,
  params?: AnalysisParams,
): Confluence {
  const perTimeframe: TimeframeVerdict[] = CONFLUENCE_TIMEFRAMES.map((timeframe) => {
    const candles = candlesByTimeframe[timeframe] ?? [];
    const suggestion = suggestLatest(candles, config, params);
    const norm = suggestion && suggestion.maxScore > 0 ? suggestion.score / suggestion.maxScore : 0;
    return { timeframe, suggestion, norm };
  });

  let buyCount = 0;
  let sellCount = 0;
  let neutralCount = 0;
  let normSum = 0;
  let normCounted = 0;

  for (const verdict of perTimeframe) {
    const direction = verdict.suggestion?.direction ?? 'neutral';
    if (direction === 'buy') buyCount++;
    else if (direction === 'sell') sellCount++;
    else neutralCount++;

    if (verdict.suggestion !== null) {
      normSum += verdict.norm;
      normCounted++;
    }
  }

  // Không khung nào có suggestion → trung lập, không chia 0.
  const meanNorm = normCounted > 0 ? normSum / normCounted : 0;
  const overall: SignalDirection =
    meanNorm >= CONFLUENCE_THRESHOLD
      ? 'buy'
      : meanNorm <= -CONFLUENCE_THRESHOLD
        ? 'sell'
        : 'neutral';

  return { perTimeframe, buyCount, sellCount, neutralCount, meanNorm, overall };
}
