import { makeSampleSet } from '@/lib/fixtures/generate';

/**
 * Dữ liệu MẪU cho DXY (chỉ số đô la Mỹ — ICE U.S. Dollar Index) — KHÔNG phải giá thật. Xem
 * `lib/fixtures/generate.ts` cho nguyên tắc chung. Giá khởi điểm quanh 100 điểm (khoảng giá trị thực
 * tế của chỉ số những năm gần đây) + cặp seed riêng (5/6) để chuỗi khác các mã đã có.
 */
const DXY_SAMPLE = makeSampleSet(100, 100.5, 5);

export const SAMPLE_DXY_DAILY = DXY_SAMPLE.daily;
export const SAMPLE_DXY_HOURLY = DXY_SAMPLE.hourly;
