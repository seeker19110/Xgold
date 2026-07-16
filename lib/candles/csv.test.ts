import { describe, expect, it } from 'vitest';
import { candlesCsvFileName, candlesToCsv } from '@/lib/candles/csv';
import type { Candle } from '@/lib/candles/types';

const CANDLES: Candle[] = [
  { ts: '2026-07-03T08:00:00.000Z', open: 100, high: 110, low: 95, close: 105, volume: 42 },
  { ts: '2026-07-03T09:00:00.000Z', open: 105, high: 108, low: 100, close: 102, volume: null },
];

describe('candlesToCsv', () => {
  it('sinh dòng tiêu đề đúng thứ tự cột', () => {
    const csv = candlesToCsv([]);
    expect(csv).toBe('time,open,high,low,close,volume');
  });

  it('sinh một dòng dữ liệu cho mỗi nến, volume rỗng khi null', () => {
    const csv = candlesToCsv(CANDLES);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-07-03T08:00:00.000Z,100,110,95,105,42');
    expect(lines[2]).toBe('2026-07-03T09:00:00.000Z,105,108,100,102,');
  });
});

describe('candlesCsvFileName', () => {
  it('ghép mã (thường) + khung thời gian + hậu tố cố định', () => {
    expect(candlesCsvFileName('XAUUSD', '1h')).toBe('xauusd-1h-candles.csv');
  });
});
