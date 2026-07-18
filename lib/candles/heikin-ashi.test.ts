import { describe, expect, it } from 'vitest';
import { toHeikinAshi } from '@/lib/candles/heikin-ashi';
import type { Candle } from '@/lib/candles/types';

function c(ts: string, open: number, high: number, low: number, close: number): Candle {
  return { ts, open, high, low, close, volume: 10 };
}

describe('toHeikinAshi', () => {
  it('dãy tăng liên tục: khớp giá trị tính tay', () => {
    const candles: Candle[] = [
      c('2026-07-03T00:00:00.000Z', 100, 105, 99, 104),
      c('2026-07-03T01:00:00.000Z', 104, 110, 103, 108),
      c('2026-07-03T02:00:00.000Z', 108, 115, 107, 113),
    ];

    const ha = toHeikinAshi(candles);

    expect(ha).toHaveLength(3);

    expect(ha[0]).toMatchObject({ ts: candles[0]?.ts, volume: 10 });
    expect(ha[0]?.close).toBeCloseTo(102);
    expect(ha[0]?.open).toBeCloseTo(102);
    expect(ha[0]?.high).toBeCloseTo(105);
    expect(ha[0]?.low).toBeCloseTo(99);

    expect(ha[1]?.close).toBeCloseTo(106.25);
    expect(ha[1]?.open).toBeCloseTo(102);
    expect(ha[1]?.high).toBeCloseTo(110);
    expect(ha[1]?.low).toBeCloseTo(102);

    expect(ha[2]?.close).toBeCloseTo(110.75);
    expect(ha[2]?.open).toBeCloseTo(104.125);
    expect(ha[2]?.high).toBeCloseTo(115);
    expect(ha[2]?.low).toBeCloseTo(104.125);
  });

  it('dãy giảm liên tục: khớp giá trị tính tay', () => {
    const candles: Candle[] = [
      c('2026-07-03T00:00:00.000Z', 200, 205, 194, 196),
      c('2026-07-03T01:00:00.000Z', 196, 197, 188, 190),
      c('2026-07-03T02:00:00.000Z', 190, 191, 180, 183),
    ];

    const ha = toHeikinAshi(candles);

    expect(ha[0]?.close).toBeCloseTo(198.75);
    expect(ha[0]?.open).toBeCloseTo(198);
    expect(ha[0]?.high).toBeCloseTo(205);
    expect(ha[0]?.low).toBeCloseTo(194);

    expect(ha[1]?.close).toBeCloseTo(192.75);
    expect(ha[1]?.open).toBeCloseTo(198.375);
    expect(ha[1]?.high).toBeCloseTo(198.375);
    expect(ha[1]?.low).toBeCloseTo(188);

    expect(ha[2]?.close).toBeCloseTo(186);
    expect(ha[2]?.open).toBeCloseTo(195.5625);
    expect(ha[2]?.high).toBeCloseTo(195.5625);
    expect(ha[2]?.low).toBeCloseTo(180);
  });

  it('dãy dao động có đảo chiều: haOpen phải đệ quy trên giá trị HA (không phải open/close gốc)', () => {
    // C0 tăng, C1 đảo chiều giảm mạnh, C2 đảo chiều tăng lại — lộ lỗi nếu haOpen[i] dùng nhầm
    // open/close của nến gốc thay vì haOpen/haClose đã tính ở bước trước.
    const candles: Candle[] = [
      c('2026-07-03T00:00:00.000Z', 100, 106, 98, 104),
      c('2026-07-03T01:00:00.000Z', 104, 108, 95, 97),
      c('2026-07-03T02:00:00.000Z', 97, 103, 94, 101),
    ];

    const ha = toHeikinAshi(candles);

    expect(ha[0]?.close).toBeCloseTo(102);
    expect(ha[0]?.open).toBeCloseTo(102);
    expect(ha[0]?.high).toBeCloseTo(106);
    expect(ha[0]?.low).toBeCloseTo(98);

    expect(ha[1]?.close).toBeCloseTo(101);
    expect(ha[1]?.open).toBeCloseTo(102);
    expect(ha[1]?.high).toBeCloseTo(108);
    expect(ha[1]?.low).toBeCloseTo(95);

    // haOpen2 đúng = (haOpen1 + haClose1)/2 = (102 + 101)/2 = 101.5
    // (nếu dùng nhầm open1/close1 gốc thì ra 100.5 — test này sẽ bắt được)
    expect(ha[2]?.open).toBeCloseTo(101.5);
    expect(ha[2]?.close).toBeCloseTo(98.75);
    expect(ha[2]?.high).toBeCloseTo(103);
    expect(ha[2]?.low).toBeCloseTo(94);
  });

  it('input rỗng → trả [] (không throw)', () => {
    expect(toHeikinAshi([])).toEqual([]);
  });
});
