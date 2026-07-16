import { makeSampleSet } from '@/lib/fixtures/generate';

/**
 * Dữ liệu MẪU cho XAG/USD (bạc thế giới) — KHÔNG phải giá thật. Xem `lib/fixtures/generate.ts` cho
 * nguyên tắc chung. Giá khởi điểm quanh 40 USD/oz (khoảng giá bạc thực tế) + cặp seed riêng (3/4) để
 * chuỗi khác XAU/USD; biên độ dao động tỉ lệ theo giá nên vẫn hợp lý ở mức giá thấp này.
 */
const XAGUSD_SAMPLE = makeSampleSet(40, 41, 3);

export const SAMPLE_XAGUSD_DAILY = XAGUSD_SAMPLE.daily;
export const SAMPLE_XAGUSD_HOURLY = XAGUSD_SAMPLE.hourly;
export const SAMPLE_XAGUSD_M5 = XAGUSD_SAMPLE.m5;
