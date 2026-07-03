import { z } from 'zod';

/** Khung thời gian thật sự thu thập từ provider — lưu trực tiếp vào bảng `candles`. */
export const BASE_TIMEFRAMES = ['1h', '1D'] as const;
export type BaseTimeframe = (typeof BASE_TIMEFRAMES)[number];

/** Khung thời gian hiển thị trên chart — 4h/1W tính (resample) từ 1h/1D lúc đọc, không lưu riêng. */
export const TIMEFRAMES = ['1h', '4h', '1D', '1W'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

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
