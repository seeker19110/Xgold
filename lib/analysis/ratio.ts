import type { Candle } from '@/lib/candles/types';

/**
 * Ghép 2 chuỗi nến theo `ts` chung (inner join, thứ tự theo `a`), tỷ lệ = a.close / b.close.
 * Bỏ điểm không có `ts` khớp ở `b` hoặc `b.close` <= 0 (chống chia 0 — CLAUDE.md §3.6).
 */
export function ratioSeries(
  a: readonly Candle[],
  b: readonly Candle[],
): { ts: string; ratio: number }[] {
  const closeByTsB = new Map(b.map((candle) => [candle.ts, candle.close]));
  const result: { ts: string; ratio: number }[] = [];

  for (const candleA of a) {
    const closeB = closeByTsB.get(candleA.ts);
    if (closeB === undefined || closeB <= 0) continue;
    result.push({ ts: candleA.ts, ratio: candleA.close / closeB });
  }

  return result;
}

/** Lợi suất đơn giản trên chuỗi close: `close[i]/close[i-1] - 1`. Bỏ qua bước có close[i-1] = 0. */
function returnsFromCloses(closes: readonly number[]): number[] {
  if (closes.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1] ?? 0;
    const curr = closes[i] ?? 0;
    // prev = 0 → lợi suất không xác định (chia 0); ghi 0 thay vì Infinity/NaN, giữ mảng dài n-1.
    returns.push(prev === 0 ? 0 : curr / prev - 1);
  }
  return returns;
}

/** Lợi suất đơn giản close[i]/close[i-1]-1. Trả mảng dài n-1 (n<2 → []). */
export function simpleReturns(candles: readonly Candle[]): number[] {
  return returnsFromCloses(candles.map((c) => c.close));
}

/**
 * Hệ số tương quan Pearson trên 2 mảng ĐÃ align cùng độ dài. `null` nếu <2 điểm, độ dài lệch nhau,
 * hoặc phương sai một bên = 0 (chia 0 — đường thẳng ngang không có tương quan xác định). Kết quả
 * kẹp về [−1, +1] để tránh sai số dấu phẩy động vượt biên lý thuyết.
 */
export function pearson(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;

  const n = a.length;
  const meanA = a.reduce((sum, x) => sum + x, 0) / n;
  const meanB = b.reduce((sum, x) => sum + x, 0) / n;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] ?? 0) - meanA;
    const db = (b[i] ?? 0) - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }

  if (varianceA === 0 || varianceB === 0) return null;

  const r = covariance / Math.sqrt(varianceA * varianceB);
  return Math.max(-1, Math.min(1, r));
}

/** Ghép 2 chuỗi nến theo `ts` chung (inner join, thứ tự theo `a`) → 2 mảng close cùng độ dài. */
function alignCloses(
  a: readonly Candle[],
  b: readonly Candle[],
): { closesA: number[]; closesB: number[] } {
  const closeByTsB = new Map(b.map((candle) => [candle.ts, candle.close]));
  const closesA: number[] = [];
  const closesB: number[] = [];

  for (const candleA of a) {
    const closeB = closeByTsB.get(candleA.ts);
    if (closeB === undefined) continue;
    closesA.push(candleA.close);
    closesB.push(closeB);
  }

  return { closesA, closesB };
}

/**
 * Align XAU & DXY theo `ts` chung → lợi suất đơn giản → Pearson trên `window` điểm gần nhất
 * (mặc định 30). `null` nếu chưa đủ dữ liệu (align/return xong còn <2 điểm).
 */
export function correlationXauDxy(
  xau: readonly Candle[],
  dxy: readonly Candle[],
  window = 30,
): number | null {
  const { closesA, closesB } = alignCloses(xau, dxy);
  const returnsA = returnsFromCloses(closesA);
  const returnsB = returnsFromCloses(closesB);

  const n = Math.min(returnsA.length, returnsB.length, window);
  if (n < 2) return null;

  return pearson(returnsA.slice(-n), returnsB.slice(-n));
}
