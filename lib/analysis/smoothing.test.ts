import { describe, expect, it } from 'vitest';
import { emaSeries } from '@/lib/analysis/smoothing';

describe('emaSeries', () => {
  it('span ≤ 1 → trả nguyên chuỗi (tắt làm trơn), không phải cùng tham chiếu', () => {
    const input = [1, -1, 1];
    expect(emaSeries(input, 0)).toEqual(input);
    expect(emaSeries(input, 1)).toEqual(input);
    expect(emaSeries(input, 1)).not.toBe(input);
  });

  it('chuỗi rỗng → rỗng, không crash', () => {
    expect(emaSeries([], 8)).toEqual([]);
  });

  it('giá trị tính tay với span 3 (alpha = 0.5)', () => {
    // alpha = 2/(3+1) = 0.5. Khởi tạo bằng phần tử đầu.
    // [0, 1, 1, 1] → 0; 0.5·1+0.5·0 = 0.5; 0.5·1+0.5·0.5 = 0.75; 0.875.
    const out = emaSeries([0, 1, 1, 1], 3);
    expect(out[0]).toBeCloseTo(0, 12);
    expect(out[1]).toBeCloseTo(0.5, 12);
    expect(out[2]).toBeCloseTo(0.75, 12);
    expect(out[3]).toBeCloseTo(0.875, 12);
  });

  it('chuỗi hằng → giữ nguyên hằng đó (không trôi)', () => {
    for (const v of emaSeries([0.4, 0.4, 0.4, 0.4], 8)) expect(v).toBeCloseTo(0.4, 12);
  });

  it('NHÂN QUẢ: phần tử i không đổi khi thêm dữ liệu phía sau', () => {
    const short = emaSeries([1, -1, 0.5, 0.2], 5);
    const long = emaSeries([1, -1, 0.5, 0.2, 9, -9, 3], 5);
    for (let i = 0; i < short.length; i++) expect(long[i]).toBeCloseTo(short[i]!, 12);
  });

  it('làm giảm biên độ dao động của chuỗi lật dấu liên tục', () => {
    const flip = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const out = emaSeries(flip, 8);
    // Sau vùng khởi động, biên độ co lại quanh 0 thay vì nhảy ±1.
    for (const v of out.slice(10)) expect(Math.abs(v)).toBeLessThan(0.3);
  });

  it('span càng lớn càng trơn (biên độ dao động càng nhỏ)', () => {
    const flip = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const spread = (span: number) => {
      const out = emaSeries(flip, span).slice(20);
      return Math.max(...out) - Math.min(...out);
    };
    expect(spread(12)).toBeLessThan(spread(5));
    expect(spread(5)).toBeLessThan(spread(3));
  });
});
