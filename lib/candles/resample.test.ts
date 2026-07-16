import { describe, expect, it } from 'vitest';
import { resample } from '@/lib/candles/resample';
import type { Candle } from '@/lib/candles/types';

function c(
  ts: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number | null = null,
): Candle {
  return { ts, open, high, low, close, volume };
}

describe('resample', () => {
  it('trả nguyên input khi resample về đúng khung cơ sở (5m→5m, 1h→1h, 1D→1D)', () => {
    const input = [c('2026-07-03T00:00:00.000Z', 1, 2, 0.5, 1.5)];
    expect(resample(input, '5m')).toEqual(input);
    expect(resample(input, '1h')).toEqual(input);
    expect(resample(input, '1D')).toEqual(input);
  });

  it('gộp 5m→15m đúng ranh giới 15 phút UTC (00-15, 15-30) và đúng OHLCV', () => {
    const input = [
      c('2026-07-03T08:00:00.000Z', 100, 105, 98, 102, 10),
      c('2026-07-03T08:05:00.000Z', 102, 108, 101, 106, 20),
      c('2026-07-03T08:10:00.000Z', 106, 110, 104, 107, 30),
      // Bucket kế (08:15-08:30) — chỉ 1 nến.
      c('2026-07-03T08:15:00.000Z', 107, 112, 105, 111, 40),
    ];

    const result = resample(input, '15m');

    expect(result).toEqual([
      {
        ts: '2026-07-03T08:00:00.000Z',
        open: 100,
        high: 110,
        low: 98,
        close: 107, // close của nến cuối bucket (08:10)
        volume: 60,
      },
      { ts: '2026-07-03T08:15:00.000Z', open: 107, high: 112, low: 105, close: 111, volume: 40 },
    ]);
  });

  it('gộp 5m→30m: nến 08:25 và 08:30 thuộc 2 bucket khác nhau (ranh giới nửa giờ)', () => {
    const input = [
      c('2026-07-03T08:25:00.000Z', 1, 2, 0.5, 1.5),
      c('2026-07-03T08:30:00.000Z', 1.5, 3, 1, 2),
    ];

    const result = resample(input, '30m');

    expect(result).toHaveLength(2);
    expect(result[0]?.ts).toBe('2026-07-03T08:00:00.000Z');
    expect(result[1]?.ts).toBe('2026-07-03T08:30:00.000Z');
  });

  it('gộp 1h→4h đúng ranh giới khối 4 giờ UTC (00-04, 04-08) và đúng OHLCV', () => {
    const input = [
      c('2026-07-03T00:00:00.000Z', 100, 105, 98, 102, 10),
      c('2026-07-03T01:00:00.000Z', 102, 108, 101, 106, 20),
      c('2026-07-03T02:00:00.000Z', 106, 110, 104, 107, 30),
      c('2026-07-03T03:00:00.000Z', 107, 109, 103, 105, 40),
      // Bucket kế (04:00-08:00) — chỉ 1 nến.
      c('2026-07-03T04:00:00.000Z', 105, 112, 104, 111, 50),
    ];

    const result = resample(input, '4h');

    expect(result).toEqual([
      {
        ts: '2026-07-03T00:00:00.000Z',
        open: 100, // open của nến đầu bucket
        high: 110, // max cả 4 nến
        low: 98, // min cả 4 nến
        close: 105, // close của nến cuối bucket (03:00)
        volume: 100, // tổng 10+20+30+40
      },
      {
        ts: '2026-07-03T04:00:00.000Z',
        open: 105,
        high: 112,
        low: 104,
        close: 111,
        volume: 50,
      },
    ]);
  });

  it('gộp 1D→1W theo tuần ISO bắt đầu Thứ Hai UTC, Chủ Nhật vẫn thuộc tuần trước', () => {
    const input = [
      c('2026-06-29T00:00:00.000Z', 1, 1, 1, 1), // Thứ Hai — đầu tuần A
      c('2026-07-01T00:00:00.000Z', 2, 3, 1, 2.5), // Thứ Tư — vẫn tuần A
      c('2026-07-05T00:00:00.000Z', 3, 4, 2, 3.5), // Chủ Nhật — vẫn tuần A (cuối tuần)
      c('2026-07-06T00:00:00.000Z', 4, 5, 3, 4.5), // Thứ Hai kế — tuần B (bucket mới)
    ];

    const result = resample(input, '1W');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ts: '2026-06-29T00:00:00.000Z',
      open: 1,
      high: 4,
      low: 1,
      close: 3.5, // close của nến cuối tuần A (Chủ Nhật 07-05)
      volume: null,
    });
    expect(result[1]?.ts).toBe('2026-07-06T00:00:00.000Z');
  });

  it('gộp 1D→1M theo tháng dương lịch UTC, đúng cả ranh giới sang năm mới', () => {
    const input = [
      c('2026-11-28T00:00:00.000Z', 1, 1, 1, 1), // tháng 11
      c('2026-12-01T00:00:00.000Z', 2, 3, 1, 2.5), // tháng 12 — bucket mới
      c('2026-12-31T00:00:00.000Z', 3, 4, 2, 3.5), // vẫn tháng 12
      c('2027-01-01T00:00:00.000Z', 4, 5, 3, 4.5), // tháng 1 năm sau — bucket mới
    ];

    const result = resample(input, '1M');

    expect(result).toHaveLength(3);
    expect(result[0]?.ts).toBe('2026-11-01T00:00:00.000Z');
    expect(result[1]).toEqual({
      ts: '2026-12-01T00:00:00.000Z',
      open: 2,
      high: 4,
      low: 1,
      close: 3.5, // close của nến cuối tháng 12 (12-31)
      volume: null,
    });
    expect(result[2]?.ts).toBe('2027-01-01T00:00:00.000Z');
  });

  it('input rỗng trả mảng rỗng', () => {
    expect(resample([], '4h')).toEqual([]);
  });

  it('volume null ở toàn bộ nến trong bucket thì giữ null (không biến thành 0)', () => {
    const input = [
      c('2026-07-03T00:00:00.000Z', 1, 2, 0.5, 1.5, null),
      c('2026-07-03T01:00:00.000Z', 1.5, 2.5, 1, 2, null),
    ];
    const result = resample(input, '4h');
    expect(result[0]?.volume).toBeNull();
  });
});
