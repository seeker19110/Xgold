import type { Candle } from '@/lib/candles/types';

/**
 * Bộ sinh dữ liệu MẪU (KHÔNG phải giá thật) dùng chung cho mọi mã (XAU/USD, XAG/USD…) — chỉ dùng khi
 * chưa cấu hình Supabase (dev/demo cục bộ) hoặc trong test. Mọi hằng số dữ liệu mẫu bắt đầu bằng
 * SAMPLE_ để không ai nhầm là dữ liệu thật (CLAUDE.md §4 chống ảo giác); nơi dùng phải gắn nhãn rõ.
 *
 * Sinh bằng random walk có seed cố định (mulberry32) → deterministic, không gọi mạng, tái lập được
 * giữa các lần chạy test. Biên độ dao động tỉ lệ theo `startPrice` nên dùng được cho cả mã giá cao
 * (vàng ~3300 USD/oz) lẫn giá thấp (bạc ~40 USD/oz) mà không phải chỉnh tay từng mã.
 */

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function generateWalk(
  startTsMs: number,
  stepMs: number,
  count: number,
  startPrice: number,
  seed: number,
): Candle[] {
  const rand = mulberry32(seed);
  const candles: Candle[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (rand() - 0.5) * (startPrice * 0.006);
    const close = Math.max(1, open + change);
    const high = Math.max(open, close) + rand() * (startPrice * 0.002);
    const low = Math.min(open, close) - rand() * (startPrice * 0.002);

    candles.push({
      ts: new Date(startTsMs + i * stepMs).toISOString(),
      open: round2(open),
      high: round2(high),
      low: round2(Math.max(0.01, low)),
      close: round2(close),
      volume: Math.round(rand() * 1000),
    });
    price = close;
  }

  return candles;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Số nến ngày mẫu — 3 năm để khung 1W (~156 nến) và 1M (~36 nến) đủ dày khi resample. */
export const SAMPLE_DAILY_COUNT = 365 * 3;
/** Số nến 5 phút mẫu — 5 ngày (288 nến/ngày), dùng cho khung 5m/15m/30m. */
export const SAMPLE_M5_COUNT = 288 * 5;

export interface SampleSet {
  /** 3 năm nến ngày (1095 nến), dùng cho khung 1D/1W/1M mẫu. */
  daily: readonly Candle[];
  /** 14 ngày nến giờ (336 nến), dùng cho khung 1h/4h mẫu. */
  hourly: readonly Candle[];
  /** 5 ngày nến 5 phút (1440 nến), dùng cho khung 5m/15m/30m mẫu. */
  m5: readonly Candle[];
}

/**
 * Tạo bộ nến mẫu (ngày + giờ + 5 phút) cho một mã từ giá khởi điểm + bộ seed riêng của mã. Cùng
 * khung thời gian với XAU/USD gốc để mọi mã hiển thị đồng nhất. Cả 3 dải đều kết thúc quanh đầu
 * tháng 7/2026: daily 2023-07-08→2026-07-06, hourly 2026-06-20→2026-07-04, m5 2026-06-29→2026-07-04.
 */
export function makeSampleSet(
  dailyStart: number,
  hourlyStart: number,
  seedBase: number,
): SampleSet {
  return {
    daily: generateWalk(Date.UTC(2023, 6, 8), DAY_MS, SAMPLE_DAILY_COUNT, dailyStart, seedBase),
    hourly: generateWalk(Date.UTC(2026, 5, 20), HOUR_MS, 24 * 14, hourlyStart, seedBase + 1),
    // seedBase+100 (không phải +2): các mã đặt seedBase cách nhau 2 (1/3/5/7) nên +2 sẽ trùng seed
    // với chuỗi daily của mã kế tiếp → hình dạng nến lặp lại giữa các mã.
    m5: generateWalk(
      Date.UTC(2026, 5, 29),
      5 * MINUTE_MS,
      SAMPLE_M5_COUNT,
      hourlyStart,
      seedBase + 100,
    ),
  };
}
