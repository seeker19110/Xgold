/**
 * Màu mặc định + hằng số hình hoạ cho công cụ vẽ (W-511).
 *
 * Các màu dưới đây đã kiểm tra tương phản phi-văn-bản (WCAG 1.4.11, ngưỡng 3:1) trên CẢ hai nền
 * theme của dự án — Dark blue `--background: #0b1220` và Light `--background: #f7f9fc` — để nét vẽ
 * luôn phân biệt được với nền ở cả hai chế độ:
 *   - horizontal-line #2563eb: 3.62:1 (dark) / 4.90:1 (light)
 *   - trendline       #e11d48: 3.99:1 (dark) / 4.45:1 (light)
 *   - fib-retracement #0891b2: 5.08:1 (dark) / 3.49:1 (light)
 *   - selected        #ea580c: 5.26:1 (dark) / 3.37:1 (light)
 */
export const DEFAULT_HORIZONTAL_LINE_COLOR = '#2563eb';
export const DEFAULT_TRENDLINE_COLOR = '#e11d48';
export const FIB_LINE_COLOR = '#0891b2';
/** Màu áp cho nét đang được chọn (kèm tăng độ dày) — phản hồi thị giác rõ khi chọn. */
export const SELECTED_COLOR = '#ea580c';

export const LINE_WIDTH = 1.5;
export const SELECTED_LINE_WIDTH = 3;
/** Cạnh ô vuông "tay nắm" vẽ ở 2 đầu trendline khi được chọn (pixel). */
export const HANDLE_SIZE = 8;

/**
 * Sinh id duy nhất cho một nét vẽ. Không cần tính tất định (chỉ là khoá nội bộ) — ghép mốc thời gian
 * + phần ngẫu nhiên để tránh trùng khi tạo nhiều nét trong cùng mili-giây.
 */
export function newDrawingId(): string {
  return `dw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
