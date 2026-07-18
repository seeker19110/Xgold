/**
 * Hình học thuần cho hit-test công cụ vẽ (W-511). Tất cả nhận toạ độ PIXEL (đã quy đổi từ time/price
 * bằng API chart ở lớp gọi) — các hàm ở đây KHÔNG phụ thuộc lightweight-charts, dễ unit test.
 */

/** Ngưỡng khoảng cách (pixel) coi là "trúng" một nét vẽ khi click chọn. */
export const HIT_TOLERANCE_PX = 6;

/**
 * Khoảng cách ngắn nhất từ điểm (px, py) tới đoạn thẳng nối (ax, ay)–(bx, by), tính bằng pixel.
 * Chiếu điểm lên đoạn, kẹp tham số chiếu vào [0, 1] để lấy điểm gần nhất NẰM TRONG đoạn (không phải
 * đường thẳng vô hạn) — đúng cho hit-test trendline hữu hạn. Đoạn suy biến (2 đầu trùng) → khoảng
 * cách tới điểm đó.
 */
export function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);
  // t = tham số chiếu điểm lên đoạn (0 ở đầu a, 1 ở đầu b), kẹp để không vượt ra ngoài đoạn.
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/** Khoảng cách theo phương dọc (pixel) từ điểm tới một đường ngang tại `lineY`. */
export function distancePointToHorizontal(py: number, lineY: number): number {
  return Math.abs(py - lineY);
}
