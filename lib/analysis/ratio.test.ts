import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { correlationXauDxy, pearson, ratioSeries, simpleReturns } from '@/lib/analysis/ratio';

function candle(ts: string, close: number): Candle {
  return { ts, open: close, high: close, low: close, close, volume: null };
}

const TS0 = '2026-01-01T00:00:00.000Z';
const TS1 = '2026-01-02T00:00:00.000Z';
const TS2 = '2026-01-03T00:00:00.000Z';

describe('ratioSeries', () => {
  it('tỷ lệ cơ bản: XAU 3200 / XAG 40 = 80', () => {
    const xau = [candle(TS0, 3200)];
    const xag = [candle(TS0, 40)];
    expect(ratioSeries(xau, xag)).toEqual([{ ts: TS0, ratio: 80 }]);
  });

  it('align theo ts chung — bỏ điểm ts lệch không có ở chuỗi kia', () => {
    const xau = [candle(TS0, 100), candle(TS1, 110), candle(TS2, 120)];
    const xag = [candle(TS0, 10), candle(TS2, 12)]; // thiếu TS1

    expect(ratioSeries(xau, xag)).toEqual([
      { ts: TS0, ratio: 10 },
      { ts: TS2, ratio: 10 },
    ]);
  });

  it('bỏ điểm b.close <= 0 (chống chia 0)', () => {
    const xau = [candle(TS0, 100), candle(TS1, 110)];
    const xag = [candle(TS0, 0), candle(TS1, 10)];

    expect(ratioSeries(xau, xag)).toEqual([{ ts: TS1, ratio: 11 }]);
  });
});

describe('simpleReturns', () => {
  it('tính tay: [100,110,99] → [0.1, -0.1]', () => {
    const candles = [candle(TS0, 100), candle(TS1, 110), candle(TS2, 99)];
    const returns = simpleReturns(candles);
    expect(returns).toHaveLength(2);
    expect(returns[0]).toBeCloseTo(0.1, 12);
    expect(returns[1]).toBeCloseTo(-0.1, 12);
  });

  it('mảng < 2 nến → []', () => {
    expect(simpleReturns([])).toEqual([]);
    expect(simpleReturns([candle(TS0, 100)])).toEqual([]);
  });

  it('close trước đó = 0 → trả 0 thay vì Infinity/NaN (chống chia 0)', () => {
    const candles = [candle(TS0, 0), candle(TS1, 50)];
    expect(simpleReturns(candles)).toEqual([0]);
  });
});

describe('pearson', () => {
  it('đồng biến hoàn hảo → +1', () => {
    expect(pearson([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 12);
  });

  it('nghịch biến hoàn hảo → -1', () => {
    expect(pearson([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 12);
  });

  it('phương sai một bên = 0 (đường thẳng ngang) → null', () => {
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull();
  });

  it('< 2 điểm → null', () => {
    expect(pearson([1], [1])).toBeNull();
    expect(pearson([], [])).toBeNull();
  });

  it('độ dài lệch nhau → null', () => {
    expect(pearson([1, 2, 3], [1, 2])).toBeNull();
  });
});

describe('correlationXauDxy', () => {
  it('lợi suất nghịch biến hoàn hảo (mỗi bước DXY = -XAU) → -1', () => {
    // xau: 100 → +10% → 110 → +20% → 132 → -5% → 125.4 (returns [0.1, 0.2, -0.05])
    // dxy: 100 → -10% → 90  → -20% → 72  → +5% → 75.6  (returns [-0.1, -0.2, 0.05]) — đúng -1 lần
    // lợi suất XAU ở từng bước → tương quan lợi suất phải là -1 (tính tay).
    const ts3 = '2026-01-04T00:00:00.000Z';
    const xauCandles = [candle(TS0, 100), candle(TS1, 110), candle(TS2, 132), candle(ts3, 125.4)];
    const dxyCandles = [candle(TS0, 100), candle(TS1, 90), candle(TS2, 72), candle(ts3, 75.6)];

    expect(correlationXauDxy(xauCandles, dxyCandles, 3)).toBeCloseTo(-1, 6);
  });

  it('thiếu dữ liệu (chưa đủ 2 lợi suất align) → null', () => {
    const xau = [candle(TS0, 100)];
    const dxy = [candle(TS0, 90)];
    expect(correlationXauDxy(xau, dxy)).toBeNull();
  });

  it('không có ts chung nào → null', () => {
    const xau = [candle(TS0, 100), candle(TS1, 110)];
    const dxy = [candle('2099-01-01T00:00:00.000Z', 90), candle('2099-01-02T00:00:00.000Z', 80)];
    expect(correlationXauDxy(xau, dxy)).toBeNull();
  });
});
