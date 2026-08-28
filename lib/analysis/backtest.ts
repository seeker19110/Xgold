import type { Candle } from '@/lib/candles/types';
import type { AnalysisConfig } from '@/lib/analysis/config';
import { signalEvents } from '@/lib/analysis/combine';
import {
  DEFAULT_LABEL_OPTIONS,
  labelSignals,
  type LabelOptions,
  type LabeledSignal,
} from '@/lib/analysis/labeling';
import {
  brierScore,
  buildCalibration,
  DEFAULT_CALIBRATION_OPTIONS,
  type CalibrationOptions,
  type CalibrationTable,
} from '@/lib/analysis/calibration';
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

/**
 * Báo cáo hiệu suất THẬT của bộ quy tắc trên dữ liệu lịch sử (Đợt B — đánh giá 2026-08-28).
 * Khác `summarizeSignalHistory` (chỉ đếm tín hiệu), phần này đo **kết cục**: TP1 có chạm trước SL
 * không, kỳ vọng bao nhiêu R, và xác suất hiển thị có khớp thực tế không (Brier).
 *
 * Vẫn KHÔNG phải lời hứa hiệu suất: kết quả phụ thuộc mẫu dữ liệu, chi phí giả định, và quy ước
 * bảo thủ "SL trước TP trong cùng nến" của `labelSignals`.
 */
export interface PerformanceReport {
  signals: number;
  wins: number;
  /** Tỷ lệ TP1 chạm trước SL. `null` khi không có tín hiệu nào gán nhãn được. */
  hitRate: number | null;
  /** Kỳ vọng mỗi lệnh theo bội số R (đã trừ chi phí). */
  expectancyR: number | null;
  /** Tổng lãi/lỗ theo R. */
  totalR: number;
  outcomes: Record<'tp2' | 'tp1' | 'sl' | 'timeout', number>;
  avgMfeR: number | null;
  avgMaeR: number | null;
  avgBarsHeld: number | null;
  /** Tín hiệu bị loại khỏi mẫu và vì sao (minh bạch: mẫu đã bị lọc thế nào). */
  skippedByReason: Record<string, number>;
  skippedNoFuture: number;
}

function summarize(
  labeled: readonly LabeledSignal[],
): Omit<PerformanceReport, 'skippedByReason' | 'skippedNoFuture'> {
  const outcomes = { tp2: 0, tp1: 0, sl: 0, timeout: 0 };
  let wins = 0;
  let totalR = 0;
  let mfeSum = 0;
  let maeSum = 0;
  let barsSum = 0;

  for (const s of labeled) {
    outcomes[s.outcome] += 1;
    if (s.win) wins += 1;
    totalR += s.rMultiple;
    mfeSum += s.mfeR;
    maeSum += s.maeR;
    barsSum += s.barsHeld;
  }

  const n = labeled.length;
  return {
    signals: n,
    wins,
    hitRate: n > 0 ? wins / n : null,
    expectancyR: n > 0 ? totalR / n : null,
    totalR,
    outcomes,
    avgMfeR: n > 0 ? mfeSum / n : null,
    avgMaeR: n > 0 ? maeSum / n : null,
    avgBarsHeld: n > 0 ? barsSum / n : null,
  };
}

export function evaluatePerformance(
  candles: readonly Candle[],
  config: AnalysisConfig,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
  labelOptions: LabelOptions = DEFAULT_LABEL_OPTIONS,
): PerformanceReport {
  const { labeled, skippedByReason, skippedNoFuture } = labelSignals(
    candles,
    config,
    params,
    labelOptions,
  );
  return { ...summarize(labeled), skippedByReason, skippedNoFuture };
}

export interface WalkForwardFold {
  /** Số tín hiệu dùng để dựng bảng hiệu chuẩn (đoạn quá khứ của fold này). */
  trainSignals: number;
  /** Số tín hiệu dùng để CHẤM bảng đó (đoạn tương lai — chưa từng nhìn thấy khi hiệu chuẩn). */
  testSignals: number;
  table: CalibrationTable;
  /** Brier trên đoạn test. `null` khi bảng không đủ mẫu để đưa xác suất cho tín hiệu nào. */
  brier: number | null;
  scored: number;
  test: PerformanceReport;
}

export interface WalkForwardReport {
  folds: WalkForwardFold[];
  /** Brier trung bình có trọng số theo số tín hiệu được chấm. `null` khi không fold nào chấm được. */
  meanBrier: number | null;
  totalScored: number;
}

/**
 * Đánh giá walk-forward: chia các tín hiệu đã gán nhãn theo THỨ TỰ THỜI GIAN thành `folds` đoạn,
 * mỗi bước hiệu chuẩn trên toàn bộ quá khứ rồi chấm trên đoạn kế tiếp. Hiệu chuẩn và chấm trên
 * cùng một mẫu sẽ cho Brier đẹp giả tạo — đây là cách duy nhất để biết bảng có tổng quát hoá không.
 */
export function walkForward(
  candles: readonly Candle[],
  config: AnalysisConfig,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
  labelOptions: LabelOptions = DEFAULT_LABEL_OPTIONS,
  calibrationOptions: CalibrationOptions = DEFAULT_CALIBRATION_OPTIONS,
  folds = 3,
): WalkForwardReport {
  const { labeled } = labelSignals(candles, config, params, labelOptions);
  const segments = Math.max(2, Math.floor(folds));
  const size = Math.floor(labeled.length / segments);
  const out: WalkForwardFold[] = [];
  let brierSum = 0;
  let totalScored = 0;

  // Fold đầu chỉ làm dữ liệu huấn luyện — không có quá khứ nào để hiệu chuẩn cho nó.
  for (let f = 1; f < segments; f++) {
    const trainEnd = f * size;
    const testEnd = f === segments - 1 ? labeled.length : trainEnd + size;
    const train = labeled.slice(0, trainEnd);
    const test = labeled.slice(trainEnd, testEnd);
    if (test.length === 0) continue;

    const table = buildCalibration(train, calibrationOptions);
    const { score, scored } = brierScore(table, test);
    if (score !== null) {
      brierSum += score * scored;
      totalScored += scored;
    }
    out.push({
      trainSignals: train.length,
      testSignals: test.length,
      table,
      brier: score,
      scored,
      test: { ...summarize(test), skippedByReason: {}, skippedNoFuture: 0 },
    });
  }

  return {
    folds: out,
    meanBrier: totalScored > 0 ? brierSum / totalScored : null,
    totalScored,
  };
}
