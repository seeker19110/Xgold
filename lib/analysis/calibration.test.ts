import { describe, expect, it } from 'vitest';
import {
  brierScore,
  buildCalibration,
  calibratedProbability,
  poolAdjacentViolators,
  wilsonInterval,
} from '@/lib/analysis/calibration';
import type { LabeledSignal } from '@/lib/analysis/labeling';

function signal(ratio: number, win: boolean): LabeledSignal {
  return {
    ts: '2026-01-01T00:00:00.000Z',
    direction: 'buy',
    ratio,
    entry: 100,
    sl: 90,
    tp1: 115,
    tp2: 125,
    outcome: win ? 'tp1' : 'sl',
    win,
    rMultiple: win ? 1.5 : -1,
    barsHeld: 3,
    mfeR: win ? 1.5 : 0.2,
    maeR: win ? -0.2 : -1,
  };
}

/** n tín hiệu cùng khoang `ratio`, trong đó `wins` cái thắng. */
function group(ratio: number, n: number, wins: number): LabeledSignal[] {
  return Array.from({ length: n }, (_, i) => signal(ratio, i < wins));
}

describe('poolAdjacentViolators', () => {
  it('chuỗi đã không giảm → giữ nguyên', () => {
    expect(poolAdjacentViolators([0.1, 0.3, 0.6], [10, 10, 10])).toEqual([0.1, 0.3, 0.6]);
  });

  it('gộp cặp vi phạm về trung bình có trọng số', () => {
    // 0.8 rồi 0.2 là răng cưa ngược chiều; trọng số 10 và 30 → (0.8*10 + 0.2*30)/40 = 0.35.
    expect(poolAdjacentViolators([0.8, 0.2], [10, 30])).toEqual([0.35, 0.35]);
  });

  it('gộp lan truyền ngược qua nhiều khối', () => {
    // [0.9, 0.5, 0.1] trọng số bằng nhau → tất cả về trung bình 0.5.
    const out = poolAdjacentViolators([0.9, 0.5, 0.1], [1, 1, 1]);
    expect(out).toHaveLength(3);
    for (const v of out) expect(v).toBeCloseTo(0.5, 10);
  });

  it('khoang rỗng (trọng số 0) không kéo lệch khoang có mẫu', () => {
    const out = poolAdjacentViolators([0.9, 0, 0.95], [10, 0, 10]);
    expect(out[0]).toBeCloseTo(0.9, 10);
    expect(out[2]).toBeCloseTo(0.95, 10);
  });
});

describe('wilsonInterval', () => {
  it('mẫu rỗng → dải rộng nhất (0..1), không chia 0', () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 1 });
  });

  it('50/100 → khoảng đối xứng quanh 0.5, nằm trong (0,1)', () => {
    const { low, high } = wilsonInterval(50, 100);
    expect(low).toBeGreaterThan(0.39);
    expect(high).toBeLessThan(0.61);
    expect((low + high) / 2).toBeCloseTo(0.5, 10);
  });

  it('mẫu càng lớn khoảng càng hẹp', () => {
    const small = wilsonInterval(7, 10);
    const large = wilsonInterval(70, 100);
    expect(large.high - large.low).toBeLessThan(small.high - small.low);
  });
});

describe('buildCalibration', () => {
  it('tần suất thô đúng theo khoang, và đơn điệu hoá khi có răng cưa', () => {
    // 2 khoang (0–0.5, 0.5–1). Khoang thấp thắng 8/10 = 0.8; khoang cao thắng 2/10 = 0.2 →
    // vi phạm giả thiết đơn điệu → PAV gộp cả hai về (8+2)/20 = 0.5.
    const table = buildCalibration([...group(0.2, 10, 8), ...group(0.8, 10, 2)], {
      bins: 2,
      minBinSample: 5,
    });
    expect(table.bins[0]!.rawRate).toBeCloseTo(0.8, 10);
    expect(table.bins[1]!.rawRate).toBeCloseTo(0.2, 10);
    expect(table.bins[0]!.rate).toBeCloseTo(0.5, 10);
    expect(table.bins[1]!.rate).toBeCloseTo(0.5, 10);
    expect(table.sampleSize).toBe(20);
  });

  it('ratio = 1 rơi vào khoang cuối (biên phải đóng), không rơi ra ngoài', () => {
    const table = buildCalibration(group(1, 10, 6), { bins: 4, minBinSample: 1 });
    expect(table.bins[3]!.count).toBe(10);
  });
});

describe('calibratedProbability', () => {
  const table = buildCalibration([...group(0.2, 30, 9), ...group(0.8, 30, 24)], {
    bins: 2,
    minBinSample: 20,
  });

  it('khoang đủ mẫu → trả xác suất thực nghiệm + khoảng tin cậy + cỡ mẫu', () => {
    const low = calibratedProbability(table, 0.2);
    expect(low?.probability).toBeCloseTo(0.3, 10);
    expect(low?.sampleSize).toBe(30);
    expect(low!.ciLow).toBeLessThan(0.3);
    expect(low!.ciHigh).toBeGreaterThan(0.3);

    expect(calibratedProbability(table, 0.9)?.probability).toBeCloseTo(0.8, 10);
  });

  it('khoang thiếu mẫu → null, KHÔNG đưa số dựa trên vài lần quan sát', () => {
    const thin = buildCalibration(group(0.9, 3, 3), { bins: 2, minBinSample: 20 });
    expect(calibratedProbability(thin, 0.9)).toBeNull();
  });
});

describe('brierScore', () => {
  it('dự báo hoàn hảo (0 hoặc 1) → 0', () => {
    const perfect = buildCalibration([...group(0.1, 20, 0), ...group(0.9, 20, 20)], {
      bins: 2,
      minBinSample: 5,
    });
    const { score, scored } = brierScore(perfect, [...group(0.1, 20, 0), ...group(0.9, 20, 20)]);
    expect(score).toBeCloseTo(0, 10);
    expect(scored).toBe(40);
  });

  it('bảng nói 0.5 cho mọi thứ → 0.25 (đoán bừa)', () => {
    const coin = buildCalibration(group(0.5, 40, 20), { bins: 1, minBinSample: 5 });
    expect(brierScore(coin, group(0.5, 40, 20)).score).toBeCloseTo(0.25, 10);
  });

  it('bỏ qua tín hiệu mà bảng không đủ mẫu để chấm', () => {
    const table = buildCalibration(group(0.9, 30, 15), { bins: 2, minBinSample: 20 });
    // ratio 0.1 rơi vào khoang rỗng (count 0 < 20) → không chấm được.
    expect(brierScore(table, group(0.1, 5, 3)).scored).toBe(0);
    expect(brierScore(table, group(0.1, 5, 3)).score).toBeNull();
  });
});
