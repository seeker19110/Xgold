/** Giao cắt gần nhất giữa 2 chuỗi trong cửa sổ `lookback` nến tính đến `index` (dùng chung R1/R4). */
export interface Cross {
  /** Index nến xảy ra giao cắt. */
  at: number;
  direction: 'up' | 'down';
}

/**
 * Tìm giao cắt GẦN NHẤT của chuỗi `a` so với chuỗi `b` trong các nến `(index - lookback, index]`.
 * Giao cắt tại nến j cần đủ 4 giá trị a/b tại j-1 và j (thiếu dữ liệu → bỏ qua nến đó, không đoán).
 */
export function findRecentCross(
  a: readonly (number | null)[],
  b: readonly (number | null)[],
  index: number,
  lookback: number,
): Cross | null {
  const from = Math.max(1, index - lookback + 1);
  for (let j = index; j >= from; j--) {
    const aPrev = a[j - 1];
    const bPrev = b[j - 1];
    const aCur = a[j];
    const bCur = b[j];
    if (aPrev === null || bPrev === null || aCur === null || bCur === null) continue;
    if (aPrev === undefined || bPrev === undefined || aCur === undefined || bCur === undefined)
      continue;

    if (aPrev <= bPrev && aCur > bCur) return { at: j, direction: 'up' };
    if (aPrev >= bPrev && aCur < bCur) return { at: j, direction: 'down' };
  }
  return null;
}

/**
 * Như `findRecentCross` nhưng đọc giá trị qua HÀM TRUY CẬP thay vì mảng dựng sẵn — dùng khi một
 * trong hai chuỗi phải tính tại chỗ (vd biên mây Ichimoku). Tránh việc dựng lại mảng dài bằng cả
 * lịch sử ở mỗi lần gọi, thứ biến một lần quét toàn chuỗi thành chi phí bậc hai.
 */
export function findRecentCrossBy(
  a: (index: number) => number | null | undefined,
  b: (index: number) => number | null | undefined,
  index: number,
  lookback: number,
): Cross | null {
  const from = Math.max(1, index - lookback + 1);
  for (let j = index; j >= from; j--) {
    const aPrev = a(j - 1);
    const bPrev = b(j - 1);
    const aCur = a(j);
    const bCur = b(j);
    if (aPrev === null || bPrev === null || aCur === null || bCur === null) continue;
    if (aPrev === undefined || bPrev === undefined || aCur === undefined || bCur === undefined)
      continue;

    if (aPrev <= bPrev && aCur > bCur) return { at: j, direction: 'up' };
    if (aPrev >= bPrev && aCur < bCur) return { at: j, direction: 'down' };
  }
  return null;
}
