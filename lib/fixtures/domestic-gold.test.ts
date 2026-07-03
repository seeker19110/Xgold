import { describe, expect, it } from 'vitest';
import { DomesticGoldPriceSchema } from '@/lib/providers-domestic/types';
import { SAMPLE_DOMESTIC_GOLD } from '@/lib/fixtures/domestic-gold';

describe('SAMPLE_DOMESTIC_GOLD', () => {
  it('có ít nhất 1 sản phẩm', () => {
    expect(SAMPLE_DOMESTIC_GOLD.length).toBeGreaterThan(0);
  });

  it('mọi dòng đều hợp lệ theo DomesticGoldPriceSchema (sell >= buy, buy > 0)', () => {
    for (const p of SAMPLE_DOMESTIC_GOLD) {
      expect(() => DomesticGoldPriceSchema.parse(p)).not.toThrow();
    }
  });

  it('ts luôn ở quá khứ gần (trong vòng 1 giờ trước "bây giờ") — để demo badge độ tươi hợp lý', () => {
    const now = Date.now();
    for (const p of SAMPLE_DOMESTIC_GOLD) {
      const ageMs = now - Date.parse(p.ts);
      expect(ageMs).toBeGreaterThanOrEqual(0);
      expect(ageMs).toBeLessThan(60 * 60 * 1000);
    }
  });

  it('source luôn gắn nhãn "sample" — không nhầm là dữ liệu thật', () => {
    for (const p of SAMPLE_DOMESTIC_GOLD) {
      expect(p.source).toBe('sample');
    }
  });
});
