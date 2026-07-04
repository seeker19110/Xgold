import type { Candle } from '@/lib/candles/types';
import type { AnalysisConfig } from '@/lib/analysis/config';
import { signalEvents } from '@/lib/analysis/combine';
import {
  DEFAULT_ANALYSIS_PARAMS,
  type AnalysisParams,
  type SignalEvent,
} from '@/lib/analysis/types';

/**
 * Thống kê MÔ TẢ tín hiệu lịch sử (Đợt 8 — kế hoạch mục 5): đếm số lần và phân bố theo năm.
 * KHÔNG đo lợi nhuận/win-rate, KHÔNG hứa hẹn hiệu suất (ADR-0007) — chỉ giúp kiểm chứng bộ quy
 * tắc phát tín hiệu với tần suất hợp lý trên dữ liệu thật.
 */
export interface SignalHistorySummary {
  totalBuy: number;
  totalSell: number;
  /** Khóa = năm UTC (vd "2026"), sắp theo thứ tự lặp của object — người gọi tự sort nếu cần. */
  byYear: Record<string, { buy: number; sell: number }>;
  events: SignalEvent[];
}

export function summarizeSignalHistory(
  candles: readonly Candle[],
  config: AnalysisConfig,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
): SignalHistorySummary {
  const events = signalEvents(candles, config, params);
  const byYear: Record<string, { buy: number; sell: number }> = {};
  let totalBuy = 0;
  let totalSell = 0;

  for (const event of events) {
    const year = String(new Date(event.ts).getUTCFullYear());
    const bucket = (byYear[year] ??= { buy: 0, sell: 0 });
    if (event.direction === 'buy') {
      bucket.buy += 1;
      totalBuy += 1;
    } else {
      bucket.sell += 1;
      totalSell += 1;
    }
  }

  return { totalBuy, totalSell, byYear, events };
}
