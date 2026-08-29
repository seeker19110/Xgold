/**
 * Làm trơn chuỗi điểm tổng hợp bằng EMA trước khi phân ngưỡng (ADR-0015).
 *
 * Nghiên cứu lọc nhiễu (2026-08-29) cho thấy nhiễu của engine nằm ở chỗ **dấu của điểm lật qua lật
 * lại**, không phải ở chỗ điểm dao động quanh ngưỡng — nên dead band kiểu Schmitt trigger không
 * chạm được nguyên nhân (đo được: làm TỆ hơn), còn làm trơn chính chuỗi điểm thì trúng đích.
 */

/**
 * EMA nhân quả trên toàn chuỗi: phần tử `i` chỉ dùng dữ liệu ≤ `i`, khởi tạo bằng giá trị đầu tiên.
 * `span <= 1` trả về bản sao nguyên trạng (tắt làm trơn).
 */
export function emaSeries(values: readonly number[], span: number): number[] {
  if (span <= 1) return [...values];
  const alpha = 2 / (span + 1);
  const out: number[] = [];
  let prev: number | null = null;
  for (const value of values) {
    prev = prev === null ? value : alpha * value + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}
