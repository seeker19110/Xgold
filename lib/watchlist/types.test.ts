import { describe, expect, it } from 'vitest';
import { deserializeWatchlist, serializeWatchlist, watchlistSchema } from '@/lib/watchlist/types';

describe('serializeWatchlist / deserializeWatchlist', () => {
  it('round-trip giữ nguyên danh sách mã hợp lệ, đúng thứ tự', () => {
    const symbols = ['XAUUSD', 'DXY'];
    expect(deserializeWatchlist(serializeWatchlist(symbols))).toEqual(symbols);
  });

  it('null / chuỗi rỗng → mảng rỗng', () => {
    expect(deserializeWatchlist(null)).toEqual([]);
    expect(deserializeWatchlist('')).toEqual([]);
  });

  it('JSON hỏng → mảng rỗng, không throw', () => {
    expect(deserializeWatchlist('{khong-phai-json')).toEqual([]);
  });

  it('sai schema (không phải mảng chuỗi) → mảng rỗng', () => {
    expect(deserializeWatchlist(JSON.stringify({ foo: 'bar' }))).toEqual([]);
    expect(deserializeWatchlist(JSON.stringify([1, 2, 3]))).toEqual([]);
  });

  it('loại mã không còn được hỗ trợ (registry đổi / dữ liệu cũ)', () => {
    expect(deserializeWatchlist(JSON.stringify(['XAUUSD', 'DELISTED', 'DXY']))).toEqual([
      'XAUUSD',
      'DXY',
    ]);
  });

  it('bỏ trùng, giữ thứ tự lần ghim đầu', () => {
    expect(deserializeWatchlist(JSON.stringify(['XAUUSD', 'DXY', 'XAUUSD']))).toEqual([
      'XAUUSD',
      'DXY',
    ]);
  });

  it('schema chấp nhận mảng chuỗi', () => {
    expect(watchlistSchema.safeParse(['XAUUSD']).success).toBe(true);
    expect(watchlistSchema.safeParse('XAUUSD').success).toBe(false);
  });
});
