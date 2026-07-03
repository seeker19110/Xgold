import { describe, expect, it } from 'vitest';
import { getFreshnessStatus, latestTimestamp } from '@/lib/domestic-gold/freshness';

const NOW = Date.UTC(2026, 6, 3, 12, 0, 0); // 2026-07-03T12:00:00Z

describe('getFreshnessStatus', () => {
  it('trả "unknown" khi không có ts', () => {
    expect(getFreshnessStatus(null, NOW, 30)).toBe('unknown');
  });

  it('trả "unknown" khi ts không parse được', () => {
    expect(getFreshnessStatus('không phải ngày giờ', NOW, 30)).toBe('unknown');
  });

  it('trả "fresh" khi ts cách 10 phút (< ngưỡng 30 phút)', () => {
    const ts = new Date(NOW - 10 * 60 * 1000).toISOString();
    expect(getFreshnessStatus(ts, NOW, 30)).toBe('fresh');
  });

  it('trả "fresh" đúng ranh giới (ts cách đúng 30 phút = ngưỡng)', () => {
    const ts = new Date(NOW - 30 * 60 * 1000).toISOString();
    expect(getFreshnessStatus(ts, NOW, 30)).toBe('fresh');
  });

  it('trả "stale" khi ts cách 31 phút (> ngưỡng 30 phút)', () => {
    const ts = new Date(NOW - 31 * 60 * 1000).toISOString();
    expect(getFreshnessStatus(ts, NOW, 30)).toBe('stale');
  });

  it('trả "fresh" khi ts ở tương lai (lệch đồng hồ nhẹ) — không báo cũ oan', () => {
    const ts = new Date(NOW + 5 * 60 * 1000).toISOString();
    expect(getFreshnessStatus(ts, NOW, 30)).toBe('fresh');
  });
});

describe('latestTimestamp', () => {
  it('trả null khi danh sách rỗng', () => {
    expect(latestTimestamp([])).toBeNull();
  });

  it('tìm đúng ts lớn nhất bất kể thứ tự đầu vào', () => {
    const prices = [
      { ts: '2026-07-03T08:00:00.000Z' },
      { ts: '2026-07-03T10:00:00.000Z' },
      { ts: '2026-07-03T09:00:00.000Z' },
    ];
    expect(latestTimestamp(prices)).toBe('2026-07-03T10:00:00.000Z');
  });
});
