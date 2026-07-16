import { makeSampleSet } from '@/lib/fixtures/generate';

/**
 * Dữ liệu MẪU cho USD/VND (tỷ giá đô la Mỹ / đồng Việt Nam) — KHÔNG phải giá thật. Xem
 * `lib/fixtures/generate.ts` cho nguyên tắc chung. Giá khởi điểm quanh 26.300 VND (khoảng tỷ giá thực
 * tế tham khảo giữa năm 2026) + cặp seed riêng (7/8) để chuỗi khác các mã đã có.
 */
const USDVND_SAMPLE = makeSampleSet(26300, 26310, 7);

export const SAMPLE_USDVND_DAILY = USDVND_SAMPLE.daily;
export const SAMPLE_USDVND_HOURLY = USDVND_SAMPLE.hourly;
export const SAMPLE_USDVND_M5 = USDVND_SAMPLE.m5;
