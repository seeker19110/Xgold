import type { Candle } from '@/lib/candles/types';
import type { AnalysisConfig } from '@/lib/analysis/config';
import { evaluateAt } from '@/lib/analysis/combine';
import { computeAnalysisInputs } from '@/lib/analysis/inputs';
import { computeTradeLevels, TP1_R_MULTIPLE, TP2_R_MULTIPLE } from '@/lib/analysis/trade-levels';
import {
  DEFAULT_ANALYSIS_PARAMS,
  type AnalysisParams,
  type SignalDirection,
} from '@/lib/analysis/types';

/** Kết cục của một tín hiệu sau khi đi tới trước qua các nến kế tiếp. */
export type LabelOutcome = 'tp2' | 'tp1' | 'sl' | 'timeout';

export interface LabelOptions {
  /** Số nến tối đa giữ lệnh trước khi đóng theo giá đóng cửa ("rào chắn thời gian"). */
  maxBars: number;
  /**
   * Chi phí vào/ra tính theo phần của giá (vd 0.0002 = 2 điểm cơ bản mỗi chiều) — chênh lệch
   * mua/bán + trượt giá. Bỏ qua chi phí này là nguồn lạc quan có hệ thống lớn nhất của backtest.
   */
  costFraction: number;
}

export const DEFAULT_LABEL_OPTIONS: LabelOptions = {
  maxBars: 60,
  costFraction: 0.0002,
};

/**
 * Một tín hiệu lịch sử đã gán nhãn kết cục thật (phương pháp "ba rào chắn": TP / SL / hết hạn).
 * `entry` là **giá mở cửa nến KẾ TIẾP** — nến tín hiệu chỉ đóng xong ở cuối nến đó, không thể vào
 * lệnh ở chính giá đóng cửa của nó. Dùng `close` như engine hiển thị sẽ tạo lạc quan có hệ thống.
 */
export interface LabeledSignal {
  ts: string;
  direction: Exclude<SignalDirection, 'neutral'>;
  /** `|score|/maxScore` tại nến tín hiệu — biến đầu vào của bảng hiệu chuẩn. */
  ratio: number;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  outcome: LabelOutcome;
  /** TP1 chạm TRƯỚC SL — biến nhị phân mà `calibration.ts` học xác suất. */
  win: boolean;
  /** Lãi/lỗ khi đóng, tính theo bội số R (R = khoảng cách entry→SL), đã trừ chi phí. */
  rMultiple: number;
  barsHeld: number;
  /** Lãi/lỗ trôi nổi tốt nhất / xấu nhất trong lúc giữ lệnh (theo R). */
  mfeR: number;
  maeR: number;
}

export interface LabelingResult {
  labeled: LabeledSignal[];
  /** Tín hiệu bị bỏ vì `computeTradeLevels` không đưa mức (theo lý do) — minh bạch mẫu bị loại. */
  skippedByReason: Record<string, number>;
  /** Tín hiệu bị bỏ vì không còn đủ nến phía sau để quan sát kết cục. */
  skippedNoFuture: number;
}

/** Giá vào lệnh sau chi phí: mua bị đẩy lên, bán bị ép xuống. */
function entryWithCost(open: number, isBuy: boolean, costFraction: number): number {
  return isBuy ? open * (1 + costFraction) : open * (1 - costFraction);
}

export interface BarrierResolution {
  outcome: LabelOutcome;
  rMultiple: number;
  barsHeld: number;
  mfeR: number;
  maeR: number;
}

/**
 * Đi tới trước từ nến `signalIndex` và xác định rào chắn nào chạm trước (TP2 / TP1 / SL), hoặc hết
 * `maxBars` thì đóng theo giá đóng cửa. Tách riêng khỏi `labelSignals` để test được bằng giá trị
 * tính tay, độc lập với việc engine sinh tín hiệu ở đâu.
 *
 * Quy ước bảo thủ: nếu trong CÙNG một nến giá chạm cả SL lẫn TP, tính là **SL** — dữ liệu OHLC
 * không cho biết thứ tự trong nến, và giả định có lợi cho mình sẽ thổi phồng tỷ lệ thắng.
 */
export function resolveBarriers(
  candles: readonly Candle[],
  signalIndex: number,
  entry: number,
  riskDist: number,
  isBuy: boolean,
  options: LabelOptions = DEFAULT_LABEL_OPTIONS,
): BarrierResolution {
  const sl = isBuy ? entry - riskDist : entry + riskDist;
  const tp1 = isBuy ? entry + TP1_R_MULTIPLE * riskDist : entry - TP1_R_MULTIPLE * riskDist;
  const tp2 = isBuy ? entry + TP2_R_MULTIPLE * riskDist : entry - TP2_R_MULTIPLE * riskDist;

  let outcome: LabelOutcome = 'timeout';
  let rMultiple = 0;
  let barsHeld = 0;
  let mfeR = 0;
  let maeR = 0;

  const lastBar = Math.min(signalIndex + options.maxBars, candles.length - 1);
  for (let j = signalIndex + 1; j <= lastBar; j++) {
    const bar = candles[j];
    if (!bar) break;
    barsHeld = j - signalIndex;

    const favorable = isBuy ? (bar.high - entry) / riskDist : (entry - bar.low) / riskDist;
    const adverse = isBuy ? (bar.low - entry) / riskDist : (entry - bar.high) / riskDist;
    if (favorable > mfeR) mfeR = favorable;
    if (adverse < maeR) maeR = adverse;

    const hitSl = isBuy ? bar.low <= sl : bar.high >= sl;
    const hitTp2 = isBuy ? bar.high >= tp2 : bar.low <= tp2;
    const hitTp1 = isBuy ? bar.high >= tp1 : bar.low <= tp1;

    if (hitSl) {
      outcome = 'sl';
      rMultiple = -1;
      break;
    }
    if (hitTp2) {
      outcome = 'tp2';
      rMultiple = TP2_R_MULTIPLE;
      break;
    }
    if (hitTp1) {
      outcome = 'tp1';
      rMultiple = TP1_R_MULTIPLE;
      break;
    }
  }

  if (outcome === 'timeout') {
    const exitBar = candles[lastBar];
    if (exitBar) {
      const exit = isBuy
        ? exitBar.close * (1 - options.costFraction)
        : exitBar.close * (1 + options.costFraction);
      rMultiple = (isBuy ? exit - entry : entry - exit) / riskDist;
    }
  }

  return { outcome, rMultiple, barsHeld, mfeR, maeR };
}

/**
 * Gán nhãn mọi thời điểm phân loại tổng hợp CHUYỂN sang Mua/Bán (cùng định nghĩa sự kiện với
 * `signalEvents`), rồi giao cho `resolveBarriers` xác định kết cục.
 */
export function labelSignals(
  candles: readonly Candle[],
  config: AnalysisConfig,
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
  options: LabelOptions = DEFAULT_LABEL_OPTIONS,
): LabelingResult {
  const inputs = computeAnalysisInputs(candles, params);
  const labeled: LabeledSignal[] = [];
  const skippedByReason: Record<string, number> = {};
  let skippedNoFuture = 0;
  let prev: SignalDirection = 'neutral';

  for (let i = 0; i < candles.length; i++) {
    const suggestion = evaluateAt(inputs, config, i, params);
    const { direction } = suggestion;
    const isNewSignal = direction !== prev && direction !== 'neutral';
    prev = direction;
    if (!isNewSignal) continue;

    const levels = computeTradeLevels(inputs, suggestion, i, params);
    if (levels.blockedReason !== null || levels.entry === null || levels.sl === null) {
      const reason = levels.blockedReason ?? 'không rõ';
      skippedByReason[reason] = (skippedByReason[reason] ?? 0) + 1;
      continue;
    }

    const nextCandle = candles[i + 1];
    if (!nextCandle) {
      skippedNoFuture += 1;
      continue;
    }

    const isBuy = direction === 'buy';
    const entry = entryWithCost(nextCandle.open, isBuy, options.costFraction);
    // Neo lại SL/TP quanh giá vào THẬT, giữ nguyên khoảng cách R mà engine đã tính ở nến tín hiệu.
    const riskDist = Math.abs(levels.entry - levels.sl);
    if (riskDist <= 0) {
      skippedByReason['khoảng cách SL bằng 0'] =
        (skippedByReason['khoảng cách SL bằng 0'] ?? 0) + 1;
      continue;
    }
    const sl = isBuy ? entry - riskDist : entry + riskDist;
    const tp1 = isBuy ? entry + TP1_R_MULTIPLE * riskDist : entry - TP1_R_MULTIPLE * riskDist;
    const tp2 = isBuy ? entry + TP2_R_MULTIPLE * riskDist : entry - TP2_R_MULTIPLE * riskDist;

    const ratio = suggestion.maxScore > 0 ? Math.abs(suggestion.score) / suggestion.maxScore : 0;

    const resolved = resolveBarriers(candles, i, entry, riskDist, isBuy, options);

    labeled.push({
      ts: suggestion.ts,
      direction: isBuy ? 'buy' : 'sell',
      ratio,
      entry,
      sl,
      tp1,
      tp2,
      win: resolved.outcome === 'tp1' || resolved.outcome === 'tp2',
      ...resolved,
    });
  }

  return { labeled, skippedByReason, skippedNoFuture };
}
