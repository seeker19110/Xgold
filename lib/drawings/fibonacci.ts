/** Các mức Fibonacci retracement chuẩn (0 tại p1, 1 tại p2). */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/**
 * Giá tại một mức Fibonacci retracement: mức 0 tại `p1Price`, mức 1 tại `p2Price`, nội suy tuyến
 * tính cho các mức ở giữa.
 */
export function fibLevelPrice(p1Price: number, p2Price: number, level: number): number {
  return p1Price + (p2Price - p1Price) * level;
}
