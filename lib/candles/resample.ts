import type { BaseTimeframe, Candle, Timeframe } from '@/lib/candles/types';

/**
 * Khung nào tính từ khung nào — chỉ resample lên (không resample xuống nhỏ hơn).
 * 15m/30m gộp từ 5m; 4h gộp từ 1h; 1W/1M gộp từ 1D. Khung cơ sở (5m/1h/1D) trả nguyên dữ liệu.
 */
export const SOURCE_TIMEFRAME: Record<Timeframe, BaseTimeframe> = {
  '5m': '5m',
  '15m': '5m',
  '30m': '5m',
  '1h': '1h',
  '4h': '1h',
  '1D': '1D',
  '1W': '1D',
  '1M': '1D',
};

const MINUTE_MS = 60 * 1000;

/**
 * Xuất riêng để test trực tiếp nhánh `default` (khung cơ sở 5m/1h/1D) — `resample()` không bao giờ
 * gọi hàm này với khung cơ sở (early-return ở dòng trên), nên nhánh đó không tới được qua API công
 * khai; export để phủ test thay vì xóa (F-020 — đúng ngữ nghĩa phòng thủ, không phải dead code).
 */
export function bucketStartMs(tsMs: number, timeframe: Timeframe): number {
  const d = new Date(tsMs);
  switch (timeframe) {
    case '15m':
      return Math.floor(tsMs / (15 * MINUTE_MS)) * (15 * MINUTE_MS);
    case '30m':
      return Math.floor(tsMs / (30 * MINUTE_MS)) * (30 * MINUTE_MS);
    case '4h': {
      // Gộp theo khối 4 giờ UTC, mốc 00:00 UTC (00-04, 04-08, ...).
      const hourBucket = Math.floor(d.getUTCHours() / 4) * 4;
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hourBucket);
    }
    case '1W': {
      // Tuần bắt đầu Thứ Hai UTC (ISO week), khớp quy ước lịch phổ biến cho chart tài chính.
      const day = d.getUTCDay(); // 0=CN..6=T7
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday);
      return monday;
    }
    case '1M':
      // Tháng dương lịch UTC, mốc ngày 01 — quy ước nến tháng của TradingView.
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    default:
      return tsMs;
  }
}

/**
 * Resample nến từ khung cơ sở (5m/1h/1D, lưu trong DB) sang khung hiển thị lớn hơn
 * (15m/30m/4h/1W/1M). Tính lúc đọc (không lưu lại) — tránh trùng lặp/lệch dữ liệu giữa khung gốc
 * và khung tổng hợp. Yêu cầu input đã sắp theo `ts` tăng dần (đúng thứ tự trả về từ CSDL theo khóa
 * chính).
 */
export function resample(candles: readonly Candle[], to: Timeframe): Candle[] {
  if (to === SOURCE_TIMEFRAME[to]) {
    return [...candles];
  }

  const result: Candle[] = [];
  let currentBucketStart = -1;
  let current: Candle | null = null;

  for (const c of candles) {
    const tsMs = Date.parse(c.ts);
    const bucketStart = bucketStartMs(tsMs, to);

    if (current === null || bucketStart !== currentBucketStart) {
      if (current) result.push(current);
      currentBucketStart = bucketStart;
      current = { ...c, ts: new Date(bucketStart).toISOString() };
    } else {
      current = {
        ts: current.ts,
        open: current.open,
        high: Math.max(current.high, c.high),
        low: Math.min(current.low, c.low),
        close: c.close, // nến cuối cùng trong bucket quyết định giá đóng cửa
        volume:
          current.volume == null && c.volume == null
            ? null
            : (current.volume ?? 0) + (c.volume ?? 0),
      };
    }
  }
  if (current) result.push(current);

  return result;
}
