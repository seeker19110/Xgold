import type { LabeledSignal } from '@/lib/analysis/labeling';

/**
 * Một khoang của bảng hiệu chuẩn: tất cả tín hiệu có `ratio` rơi vào `[lo, hi)`.
 * `rate` là tần suất thắng SAU khi làm trơn đơn điệu (PAV) — `rawRate` là tần suất thô.
 */
export interface CalibrationBin {
  lo: number;
  hi: number;
  count: number;
  wins: number;
  rawRate: number;
  rate: number;
}

export interface CalibrationTable {
  bins: CalibrationBin[];
  /** Tổng số tín hiệu đã dùng để dựng bảng. */
  sampleSize: number;
  /** Khoang có ít hơn ngần này mẫu → không trả xác suất (nói "chưa đủ dữ liệu"). */
  minBinSample: number;
}

export interface CalibratedProbability {
  /** Xác suất chạm TP1 trước SL, ước lượng từ lịch sử — 0..1. */
  probability: number;
  /** Khoảng tin cậy Wilson 95% quanh tần suất thô của khoang. */
  ciLow: number;
  ciHigh: number;
  /** Số mẫu của khoang — người đọc cần biết con số dựa trên bao nhiêu lần. */
  sampleSize: number;
}

export interface CalibrationOptions {
  bins: number;
  minBinSample: number;
}

export const DEFAULT_CALIBRATION_OPTIONS: CalibrationOptions = {
  bins: 5,
  minBinSample: 20,
};

/**
 * Hồi quy đơn điệu bằng thuật toán "pool adjacent violators" (PAV) có trọng số.
 * Giả thiết miền: đồng thuận cao hơn thì tỷ lệ thắng không được THẤP hơn — nhiễu mẫu nhỏ hay tạo
 * ra răng cưa ngược chiều, PAV gộp các khoang vi phạm về trung bình có trọng số của chúng.
 */
export function poolAdjacentViolators(
  rates: readonly number[],
  weights: readonly number[],
): number[] {
  const values: number[] = [];
  const blockWeights: number[] = [];
  const blockSizes: number[] = [];

  for (let i = 0; i < rates.length; i++) {
    let value = rates[i] ?? 0;
    let weight = weights[i] ?? 0;
    let size = 1;

    // Gộp ngược về trước chừng nào còn vi phạm thứ tự không giảm.
    while (values.length > 0 && (values[values.length - 1] ?? 0) > value) {
      const prevValue = values.pop() ?? 0;
      const prevWeight = blockWeights.pop() ?? 0;
      const prevSize = blockSizes.pop() ?? 0;
      const totalWeight = prevWeight + weight;
      value = totalWeight > 0 ? (prevValue * prevWeight + value * weight) / totalWeight : prevValue;
      weight = totalWeight;
      size += prevSize;
    }
    values.push(value);
    blockWeights.push(weight);
    blockSizes.push(size);
  }

  const out: number[] = [];
  for (let b = 0; b < values.length; b++) {
    for (let k = 0; k < (blockSizes[b] ?? 0); k++) out.push(values[b] ?? 0);
  }
  return out;
}

/** Khoảng tin cậy Wilson 95% cho tỷ lệ nhị thức — ổn định hơn công thức chuẩn khi mẫu nhỏ. */
export function wilsonInterval(wins: number, count: number): { low: number; high: number } {
  if (count === 0) return { low: 0, high: 1 };
  const z = 1.96;
  const p = wins / count;
  const denom = 1 + (z * z) / count;
  const center = p + (z * z) / (2 * count);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * count)) / count);
  return {
    low: Math.max(0, (center - margin) / denom),
    high: Math.min(1, (center + margin) / denom),
  };
}

/**
 * Dựng bảng hiệu chuẩn từ các tín hiệu đã gán nhãn: chia `ratio` (0..1) thành các khoang đều nhau,
 * đo tần suất thắng thực nghiệm mỗi khoang, rồi làm trơn đơn điệu.
 *
 * Đây là chỗ "xác suất" của sản phẩm trở thành **ước lượng từ dữ liệu** thay vì phép đổi thang
 * tuyến tính của điểm đồng thuận (khiếm khuyết B2 trong đánh giá 2026-08-28).
 */
export function buildCalibration(
  labeled: readonly LabeledSignal[],
  options: CalibrationOptions = DEFAULT_CALIBRATION_OPTIONS,
): CalibrationTable {
  const binCount = Math.max(1, Math.floor(options.bins));
  const width = 1 / binCount;
  const bins: CalibrationBin[] = Array.from({ length: binCount }, (_, i) => ({
    lo: i * width,
    hi: i === binCount - 1 ? 1 : (i + 1) * width,
    count: 0,
    wins: 0,
    rawRate: 0,
    rate: 0,
  }));

  for (const signal of labeled) {
    const clamped = Math.min(Math.max(signal.ratio, 0), 1);
    const index = Math.min(binCount - 1, Math.floor(clamped / width));
    const bin = bins[index];
    if (!bin) continue;
    bin.count += 1;
    if (signal.win) bin.wins += 1;
  }

  for (const bin of bins) bin.rawRate = bin.count > 0 ? bin.wins / bin.count : 0;

  // Khoang rỗng không mang thông tin: cho trọng số 0 để PAV không kéo lệch các khoang có mẫu.
  const smoothed = poolAdjacentViolators(
    bins.map((b) => b.rawRate),
    bins.map((b) => b.count),
  );
  bins.forEach((bin, i) => {
    bin.rate = smoothed[i] ?? bin.rawRate;
  });

  return { bins, sampleSize: labeled.length, minBinSample: options.minBinSample };
}

/**
 * Tra xác suất đã hiệu chuẩn cho một tỷ lệ đồng thuận. `null` khi khoang tương ứng chưa đủ mẫu —
 * thà không đưa số còn hơn đưa một con số dựa trên vài lần quan sát (CLAUDE.md §4).
 */
export function calibratedProbability(
  table: CalibrationTable,
  ratio: number,
): CalibratedProbability | null {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const bin = table.bins.find((b) => clamped >= b.lo && (clamped < b.hi || b.hi === 1));
  if (!bin || bin.count < table.minBinSample) return null;
  const ci = wilsonInterval(bin.wins, bin.count);
  return { probability: bin.rate, ciLow: ci.low, ciHigh: ci.high, sampleSize: bin.count };
}

/**
 * Brier score (trung bình bình phương sai số dự báo, 0 = hoàn hảo, 0.25 = đoán bừa 50%).
 * Chỉ tính trên các tín hiệu mà bảng có đủ mẫu để đưa xác suất.
 */
export function brierScore(
  table: CalibrationTable,
  labeled: readonly LabeledSignal[],
): { score: number | null; scored: number } {
  let sum = 0;
  let scored = 0;
  for (const signal of labeled) {
    const p = calibratedProbability(table, signal.ratio);
    if (!p) continue;
    const outcome = signal.win ? 1 : 0;
    sum += (p.probability - outcome) ** 2;
    scored += 1;
  }
  return { score: scored > 0 ? sum / scored : null, scored };
}
