import { describe, expect, it } from 'vitest';
import {
  deserializeAlerts,
  priceAlertSchema,
  serializeAlerts,
  shouldTrigger,
  type PriceAlert,
} from '@/lib/alerts/types';

function alert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: 'a1',
    symbol: 'XAUUSD',
    direction: 'above',
    targetPrice: 2500,
    createdAt: '2026-07-18T00:00:00.000Z',
    triggeredAt: null,
    ...overrides,
  };
}

describe('serializeAlerts / deserializeAlerts', () => {
  it('round-trip giữ nguyên alert hợp lệ', () => {
    const alerts = [alert(), alert({ id: 'a2', symbol: 'DXY', direction: 'below' })];
    expect(deserializeAlerts(serializeAlerts(alerts))).toEqual(alerts);
  });

  it('null / chuỗi rỗng → mảng rỗng', () => {
    expect(deserializeAlerts(null)).toEqual([]);
    expect(deserializeAlerts('')).toEqual([]);
  });

  it('JSON hỏng → mảng rỗng, không throw', () => {
    expect(deserializeAlerts('{khong-phai-json')).toEqual([]);
  });

  it('sai schema → mảng rỗng', () => {
    expect(deserializeAlerts(JSON.stringify({ foo: 'bar' }))).toEqual([]);
    expect(deserializeAlerts(JSON.stringify([{ id: 'x' }]))).toEqual([]);
    // targetPrice âm hoặc 0 bị loại (giá không âm)
    expect(deserializeAlerts(serializeAlerts([alert({ targetPrice: -1 })]))).toEqual([]);
    expect(deserializeAlerts(serializeAlerts([alert({ targetPrice: 0 })]))).toEqual([]);
  });

  it('loại alert của mã không còn được hỗ trợ (registry đổi / dữ liệu cũ)', () => {
    const kept = alert({ id: 'keep', symbol: 'XAUUSD' });
    const dropped = alert({ id: 'drop', symbol: 'DELISTED' });
    expect(deserializeAlerts(serializeAlerts([kept, dropped]))).toEqual([kept]);
  });

  it('schema từ chối direction lạ và targetPrice không hữu hạn', () => {
    expect(priceAlertSchema.safeParse(alert({ direction: 'sideways' as never })).success).toBe(
      false,
    );
    expect(priceAlertSchema.safeParse(alert({ targetPrice: Number.NaN })).success).toBe(false);
    expect(priceAlertSchema.safeParse(alert({ targetPrice: Infinity })).success).toBe(false);
  });
});

describe('shouldTrigger', () => {
  describe("hướng 'above'", () => {
    const above = alert({ direction: 'above', targetPrice: 2500 });

    it('giá chưa tới ngưỡng → false', () => {
      expect(shouldTrigger(above, 2499.99)).toBe(false);
    });

    it('giá đúng bằng ngưỡng → true (chạm là bắn)', () => {
      expect(shouldTrigger(above, 2500)).toBe(true);
    });

    it('giá vượt qua ngưỡng → true', () => {
      expect(shouldTrigger(above, 2500.01)).toBe(true);
    });
  });

  describe("hướng 'below'", () => {
    const below = alert({ direction: 'below', targetPrice: 2500 });

    it('giá còn trên ngưỡng → false', () => {
      expect(shouldTrigger(below, 2500.01)).toBe(false);
    });

    it('giá đúng bằng ngưỡng → true (chạm là bắn)', () => {
      expect(shouldTrigger(below, 2500)).toBe(true);
    });

    it('giá xuống dưới ngưỡng → true', () => {
      expect(shouldTrigger(below, 2499.99)).toBe(true);
    });
  });
});
