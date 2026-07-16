import { describe, expect, it } from 'vitest';
import { formatLegendChange, formatLegendPrice, legendAt } from '@/lib/candles/legend';
import type { Candle } from '@/lib/candles/types';

function c(ts: string, open: number, high: number, low: number, close: number): Candle {
  return { ts, open, high, low, close, volume: null };
}

const CANDLES: Candle[] = [
  c('2026-07-03T00:00:00.000Z', 100, 110, 95, 105),
  c('2026-07-03T01:00:00.000Z', 105, 112, 104, 110.5),
  c('2026-07-03T02:00:00.000Z', 110.5, 111, 100, 100.5),
  c('2026-07-03T03:00:00.000Z', 100.5, 101, 100, 100.5),
];

describe('legendAt', () => {
  it('nến giữa mảng: Δ so với CLOSE nến trước (quy ước TradingView), không phải close−open', () => {
    const legend = legendAt(CANDLES, 1);
    expect(legend).not.toBeNull();
    expect(legend?.open).toBe(105);
    expect(legend?.high).toBe(112);
    expect(legend?.low).toBe(104);
    expect(legend?.close).toBe(110.5);
    expect(legend?.change).toBeCloseTo(5.5); // 110.5 − 105 (close nến 0)
    expect(legend?.changePct).toBeCloseTo((5.5 / 105) * 100);
    expect(legend?.direction).toBe('up');
  });

  it('nến giảm → direction down, change âm', () => {
    const legend = legendAt(CANDLES, 2);
    expect(legend?.change).toBeCloseTo(100.5 - 110.5);
    expect(legend?.direction).toBe('down');
  });

  it('nến không đổi so với close nến trước → flat, changePct 0', () => {
    const legend = legendAt(CANDLES, 3);
    expect(legend?.change).toBe(0);
    expect(legend?.changePct).toBe(0);
    expect(legend?.direction).toBe('flat');
  });

  it('nến ĐẦU TIÊN (không có nến trước): so với open của chính nó', () => {
    const legend = legendAt(CANDLES, 0);
    expect(legend?.change).toBeCloseTo(5); // 105 − 100 (open chính nó)
    expect(legend?.direction).toBe('up');
  });

  it('index ngoài mảng hoặc mảng rỗng → null (không ném lỗi)', () => {
    expect(legendAt(CANDLES, -1)).toBeNull();
    expect(legendAt(CANDLES, CANDLES.length)).toBeNull();
    expect(legendAt([], 0)).toBeNull();
  });

  it('mốc so sánh bằng 0 → changePct 0 (không chia 0 ra Infinity/NaN)', () => {
    const weird = [
      c('2026-07-03T00:00:00.000Z', 0, 1, 0, 0),
      c('2026-07-03T01:00:00.000Z', 0, 2, 0, 1),
    ];
    const legend = legendAt(weird, 1);
    expect(legend?.changePct).toBe(0);
    expect(Number.isFinite(legend?.changePct ?? NaN)).toBe(true);
  });
});

describe('formatLegendPrice / formatLegendChange', () => {
  it('giá 2 chữ số thập phân', () => {
    expect(formatLegendPrice(3312.5)).toBe('3312.50');
  });

  it('change dương/âm/0 có dấu đúng ở cả số tuyệt đối lẫn %', () => {
    const up = legendAt(CANDLES, 1);
    const down = legendAt(CANDLES, 2);
    const flat = legendAt(CANDLES, 3);
    expect(formatLegendChange(up!)).toBe('+5.50 (+5.24%)');
    expect(formatLegendChange(down!)).toBe('−10.00 (−9.05%)');
    expect(formatLegendChange(flat!)).toBe('0.00 (0.00%)');
  });
});
