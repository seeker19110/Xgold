import { makeSampleSet } from '@/lib/fixtures/generate';

/**
 * Dữ liệu MẪU cho XAU/USD (vàng thế giới) — KHÔNG phải giá thật. Xem `lib/fixtures/generate.ts` cho
 * nguyên tắc chung (seed cố định, gắn nhãn SAMPLE_, chỉ dùng khi chưa cấu hình Supabase / trong test).
 * Giá khởi điểm 3300/3350, seedBase 1 (daily/hourly/m5 dùng seed 1/2/101 — xem makeSampleSet).
 */
const XAUUSD_SAMPLE = makeSampleSet(3300, 3350, 1);

export const SAMPLE_XAUUSD_DAILY = XAUUSD_SAMPLE.daily;
export const SAMPLE_XAUUSD_HOURLY = XAUUSD_SAMPLE.hourly;
export const SAMPLE_XAUUSD_M5 = XAUUSD_SAMPLE.m5;
