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

export interface SampleSet {
  /** ~180 nến ngày (khoảng 6 tháng), dùng cho khung 1D/1W mẫu. */
  daily: readonly Candle[];
  /** 14 ngày nến giờ (336 nến), dùng cho khung 1h/4h mẫu. */
  hourly: readonly Candle[];
}

/**
 * Tạo bộ nến mẫu (ngày + giờ) cho một mã từ giá khởi điểm + cặp seed riêng của mã. Cùng khung thời
 * gian với XAU/USD gốc để mọi mã hiển thị đồng nhất.
 */
export function makeSampleSet(
  dailyStart: number,
  hourlyStart: number,
  seedBase: number,
): SampleSet {
  return {
    daily: generateWalk(Date.UTC(2026, 0, 1), DAY_MS, 180, dailyStart, seedBase),
    hourly: generateWalk(Date.UTC(2026, 5, 20), HOUR_MS, 24 * 14, hourlyStart, seedBase + 1),
  };
}
