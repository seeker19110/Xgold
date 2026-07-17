import { describe, expect, it } from 'vitest';
import { HIT_TOLERANCE_PX, distancePointToHorizontal, distancePointToSegment } from './geometry';

describe('distancePointToSegment', () => {
  it('điểm nằm trên đoạn → 0', () => {
    expect(distancePointToSegment(5, 5, 0, 0, 10, 10)).toBeCloseTo(0);
  });

  it('khoảng cách vuông góc tới đoạn ngang', () => {
    // đoạn (0,0)-(10,0); điểm (5,3) → cách 3 theo phương dọc.
    expect(distancePointToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it('điểm chiếu NGOÀI đoạn (bên trái) → lấy khoảng cách tới đầu mút gần nhất', () => {
    // chiếu của (-5,0) lên đường thẳng nằm trước đầu a=(0,0) → kẹp về a, cách = 5.
    expect(distancePointToSegment(-5, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('điểm chiếu NGOÀI đoạn (bên phải) → tới đầu mút b', () => {
    expect(distancePointToSegment(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('đoạn suy biến (2 đầu trùng) → khoảng cách tới điểm đó', () => {
    expect(distancePointToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });

  it('đoạn chéo — khoảng cách vuông góc tính tay', () => {
    // đoạn (0,0)-(10,10) (đường y=x); điểm (0,10) cách đường y=x một khoảng 10/√2.
    expect(distancePointToSegment(0, 10, 0, 0, 10, 10)).toBeCloseTo(10 / Math.SQRT2);
  });
});

describe('distancePointToHorizontal', () => {
  it('trả về trị tuyệt đối hiệu tung độ', () => {
    expect(distancePointToHorizontal(10, 4)).toBe(6);
    expect(distancePointToHorizontal(4, 10)).toBe(6);
    expect(distancePointToHorizontal(7, 7)).toBe(0);
  });
});

describe('HIT_TOLERANCE_PX', () => {
  it('là số dương hợp lý cho vùng chạm', () => {
    expect(HIT_TOLERANCE_PX).toBeGreaterThan(0);
    expect(HIT_TOLERANCE_PX).toBeLessThanOrEqual(12);
  });
});
