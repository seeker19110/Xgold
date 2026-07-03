import type { BaseTimeframe, Candle, Timeframe } from '@/lib/candles/types';

/** Khung nào tính từ khung nào — chỉ resample lên (không resample xuống nhỏ hơn). */
const SOURCE_OF: Record<Timeframe, BaseTimeframe> = {
  '1h': '1h',
  '4h': '1h',
  '1D': '1D',
  '1W': '1D',
};

function bucketStartMs(tsMs: number, timeframe: Timeframe): number {
  const d = new Date(tsMs);
  switch (timeframe) {
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
    default:
      return tsMs;
  }
}

/**
 * Resample nến từ khung cơ sở (1h/1D, lưu trong DB) sang khung hiển thị lớn hơn (4h/1W).
 * Tính lúc đọc (không lưu lại) — tránh trùng lặp/lệch dữ liệu giữa khung gốc và khung tổng hợp.
 * Yêu cầu input đã sắp theo `ts` tăng dần (đúng thứ tự trả về từ CSDL theo khóa chính).
 */
export function resample(candles: readonly Candle[], to: Timeframe): Candle[] {
  if (to === SOURCE_OF[to] && (to === '1h' || to === '1D')) {
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
