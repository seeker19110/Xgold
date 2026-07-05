import { describe, expect, it } from 'vitest';
import { compareGoldPrice, worldGoldPricePerLuongVnd } from '@/lib/gold-compare/convert';

// Giá trị kỳ vọng tính TAY (độc lập với implementation): 1 lượng = 37.5g, 1 troy oz = 31.1034768g
// → tỷ lệ troy-oz/lượng = 37.5 / 31.1034768 = 1.2056529963235494 (11 chữ số thập phân, tính bằng máy
// tính độc lập ngoài code — không đoán, không copy từ output của hàm đang test).
describe('worldGoldPricePerLuongVnd', () => {
  it('quy đổi USD/troy-oz sang VND/lượng đúng công thức (giá trị tính tay)', () => {
    // 2000 USD/oz × 1.2056529963235494 × 25000 VND/USD = 60 282 649.816177465
    const result = worldGoldPricePerLuongVnd({ xauUsdPerOz: 2000, usdVndRate: 25000 });
    expect(result).toBeCloseTo(60282649.816177465, 3);
  });
});

describe('compareGoldPrice', () => {
  const world = { xauUsdPerOz: 2000, usdVndRate: 25000 }; // world/lượng ≈ 60 282 649.816

  it('trong nước ĐẮT hơn thế giới → diff dương', () => {
    const row = compareGoldPrice(
      { vendor: 'btmc', product: 'SJC 1L, 10L, 1KG', buy: 97_000_000, sell: 99_000_000 },
      world,
    );
    expect(row.vendor).toBe('btmc');
    expect(row.product).toBe('SJC 1L, 10L, 1KG');
    expect(row.worldPerLuongVnd).toBeCloseTo(60282649.816177465, 3);
    // 97 000 000 − 60 282 649.816177465 = 36 717 350.183822535 (≈ +60.91%)
    expect(row.diffBuyVnd).toBeCloseTo(36717350.183822535, 3);
    expect(row.diffBuyPercent).toBeCloseTo(60.90865331199999, 6);
    // 99 000 000 − 60 282 649.816177465 = 38 717 350.183822535 (≈ +64.23%)
    expect(row.diffSellVnd).toBeCloseTo(38717350.183822535, 3);
    expect(row.diffSellPercent).toBeCloseTo(64.22635750399999, 6);
  });

  it('trong nước RẺ hơn thế giới → diff âm (thế giới tăng giá mạnh, ví dụ tỷ giá/giá vàng thế giới cao hơn)', () => {
    const expensiveWorld = { xauUsdPerOz: 3300, usdVndRate: 26300 }; // world/lượng ≈ 104 638 623.551
    const row = compareGoldPrice(
      { vendor: 'btmc', product: 'SJC 1L, 10L, 1KG', buy: 97_000_000, sell: 99_000_000 },
      expensiveWorld,
    );
    expect(row.worldPerLuongVnd).toBeCloseTo(104638623.55092086, 3);
    expect(row.diffSellVnd).toBeCloseTo(-5638623.550920859, 3);
    expect(row.diffSellPercent).toBeCloseTo(-5.388663726235757, 6);
    expect(row.diffBuyVnd).toBeCloseTo(-7638623.550920859, 3);
    expect(row.diffBuyPercent).toBeCloseTo(-7.300003852978469, 6);
  });
});
