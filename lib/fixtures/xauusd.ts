import type { Candle } from '@/lib/candles/types';

/**
 * Dữ liệu MẪU (KHÔNG phải giá vàng thật) — chỉ dùng khi chưa cấu hình Supabase (dev/demo cục bộ)
 * hoặc trong test. Tên hằng số bắt đầu bằng SAMPLE_ để không ai nhầm là dữ liệu thật (CLAUDE.md §4
 * chống ảo giác). Nơi dùng fixture này (vd `/api/candles`, Đợt 2) phải gắn nhãn rõ trên UI.
 *
 * Sinh bằng random walk có seed cố định (mulberry32) → deterministic, không gọi mạng, tái lập được
 * giữa các lần chạy test.
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

function generateWalk(
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

/** ~180 nến ngày (khoảng 6 tháng), dùng cho khung 1D/1W mẫu. */
export const SAMPLE_XAUUSD_DAILY: readonly Candle[] = generateWalk(
  Date.UTC(2026, 0, 1),
  24 * 60 * 60 * 1000,
  180,
  3300,
  1,
);

/** 14 ngày nến giờ (336 nến), dùng cho khung 1h/4h mẫu. */
export const SAMPLE_XAUUSD_HOURLY: readonly Candle[] = generateWalk(
  Date.UTC(2026, 5, 20),
  60 * 60 * 1000,
  24 * 14,
  3350,
  2,
);
