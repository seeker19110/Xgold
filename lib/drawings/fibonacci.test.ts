import { describe, expect, it } from 'vitest';
import { FIB_LEVELS, fibLevelPrice } from './fibonacci';

describe('fibLevelPrice', () => {
  it('mức 0 tại p1', () => {
    expect(fibLevelPrice(100, 200, 0)).toBe(100);
  });

  it('mức 1 tại p2', () => {
    expect(fibLevelPrice(100, 200, 1)).toBe(200);
  });

  it('mức 0.5 ở giữa', () => {
    expect(fibLevelPrice(100, 200, 0.5)).toBe(150);
  });

  it('FIB_LEVELS đủ mức chuẩn', () => {
    expect(FIB_LEVELS).toEqual([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
  });
});
