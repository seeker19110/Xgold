import type { Candle } from '@/lib/candles/types';

/**
 * Chuẩn hóa dãy nến về % thay đổi so với nến đầu tiên trong mảng truyền vào — dùng để so sánh
 * nhiều mã trên cùng thang đo. Caller quyết định phạm vi ("khung nhìn") bằng cách cắt mảng trước
 * khi gọi hàm; hàm này KHÔNG tự cắt dữ liệu.
 *
 * value[i] = (close[i] - close[0]) / close[0] * 100
 *
 * Mảng rỗng hoặc `close[0] === 0` (chia cho 0) → trả `[]` (không throw).
 */
export function normalizeToPercent(candles: readonly Candle[]): { ts: string; value: number }[] {
  const base = candles[0]?.close;

  if (candles.length === 0 || base === undefined || base === 0) {
    return [];
  }

  return candles.map(({ ts, close }) => ({
    ts,
    value: ((close - base) / base) * 100,
  }));
}
