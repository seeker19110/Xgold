import { z } from 'zod';

/** Khung thời gian thật sự thu thập từ provider — lưu trực tiếp vào bảng `candles`. */
export const BASE_TIMEFRAMES = ['5m', '1h', '1D'] as const;
export type BaseTimeframe = (typeof BASE_TIMEFRAMES)[number];

/**
 * Khung thời gian hiển thị trên chart — dải chuẩn TradingView từ 5 phút đến 1 tháng.
 * Khung không phải cơ sở (15m/30m/4h/1W/1M) tính (resample) từ khung cơ sở lúc đọc, không lưu riêng
 * (xem `SOURCE_TIMEFRAME` ở lib/candles/resample.ts).
 */
export const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** Nhãn nút chuyển khung — quy ước gọn kiểu TradingView (khung ngày trở lên bỏ số '1'). */
export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
};

// Ràng buộc OHLC khớp CHECK constraint của bảng candles (migration) — chặn dữ liệu sai sớm,
// trước khi chạm CSDL, để lỗi rõ ràng hơn (tên trường) thay vì lỗi CHECK chung chung từ Postgres.
export const CandleSchema = z
  .object({
    ts: z.string(), // ISO 8601 UTC, vd "2026-07-03T08:00:00.000Z"
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nullable().optional(),
  })
  .refine((c) => c.high >= c.low, { message: 'high phải >= low' })
  .refine((c) => c.high >= c.open && c.high >= c.close, { message: 'high phải >= open và close' })
  .refine((c) => c.low <= c.open && c.low <= c.close, { message: 'low phải <= open và close' });

export type Candle = z.infer<typeof CandleSchema>;
