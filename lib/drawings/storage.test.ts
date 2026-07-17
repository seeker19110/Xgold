import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Drawing } from './types';
import { loadDrawings, saveDrawings } from './storage';

const SYMBOL = 'XAUUSD';
const KEY = `xgold:drawings:${SYMBOL}`;

const SAMPLE: Drawing[] = [
  { id: 'a', type: 'horizontal-line', price: 1950.5, color: '#ff0000' },
  {
    id: 'b',
    type: 'trendline',
    p1: { time: 1_700_000_000, price: 1900 },
    p2: { time: 1_700_100_000, price: 2000 },
    color: '#00ff00',
  },
  {
    id: 'c',
    type: 'fib-retracement',
    p1: { time: 1_700_000_000, price: 1900 },
    p2: { time: 1_700_100_000, price: 2000 },
  },
];

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('storage công cụ vẽ', () => {
  it('round-trip save → load giữ nguyên dữ liệu', () => {
    saveDrawings(SYMBOL, SAMPLE);
    expect(loadDrawings(SYMBOL)).toEqual(SAMPLE);
  });

  it('không có dữ liệu → trả mảng rỗng', () => {
    expect(loadDrawings(SYMBOL)).toEqual([]);
  });

  it('JSON hỏng → trả mảng rỗng, không throw', () => {
    localStorage.setItem(KEY, '{not valid json');
    expect(() => loadDrawings(SYMBOL)).not.toThrow();
    expect(loadDrawings(SYMBOL)).toEqual([]);
  });

  it('JSON không khớp schema → trả mảng rỗng, không throw', () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 'x', type: 'unknown' }]));
    expect(() => loadDrawings(SYMBOL)).not.toThrow();
    expect(loadDrawings(SYMBOL)).toEqual([]);
  });
});
