import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { generateWalk } from '@/lib/fixtures/generate';
import { DEFAULT_ANALYSIS_CONFIG } from '@/lib/analysis/config';
import {
  DEFAULT_LABEL_OPTIONS,
  labelSignals,
  resolveBarriers,
  type LabelOptions,
} from '@/lib/analysis/labeling';

/** Nến từ OHLC thô — `ts` chỉ để hợp lệ schema, `resolveBarriers` không dùng tới. */
function bar(open: number, high: number, low: number, close: number, i: number): Candle {
  return {
    ts: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    open,
    high,
    low,
    close,
    volume: null,
  };
}

const NO_COST: LabelOptions = { maxBars: 10, costFraction: 0 };

describe('resolveBarriers — Mua, entry 100, R = 10 (SL 90, TP1 115, TP2 125)', () => {
  it('chạm TP1 trước → outcome tp1, +1.5R', () => {
    const candles = [
      bar(100, 100, 100, 100, 0), // nến tín hiệu
      bar(100, 108, 98, 105, 1), // chưa chạm rào nào
      bar(105, 116, 104, 115, 2), // high 116 ≥ TP1 115
    ];
    const r = resolveBarriers(candles, 0, 100, 10, true, NO_COST);
    expect(r.outcome).toBe('tp1');
    expect(r.rMultiple).toBeCloseTo(1.5, 10);
    expect(r.barsHeld).toBe(2);
    expect(r.mfeR).toBeCloseTo(1.6, 10); // (116-100)/10
    expect(r.maeR).toBeCloseTo(-0.2, 10); // (98-100)/10
  });

  it('vọt thẳng qua TP2 trong một nến → outcome tp2, +2.5R (không dừng ở tp1)', () => {
    const candles = [bar(100, 100, 100, 100, 0), bar(100, 130, 99, 128, 1)];
    const r = resolveBarriers(candles, 0, 100, 10, true, NO_COST);
    expect(r.outcome).toBe('tp2');
    expect(r.rMultiple).toBeCloseTo(2.5, 10);
  });

  it('chạm SL trước → −1R', () => {
    const candles = [bar(100, 100, 100, 100, 0), bar(100, 104, 89, 91, 1)];
    const r = resolveBarriers(candles, 0, 100, 10, true, NO_COST);
    expect(r.outcome).toBe('sl');
    expect(r.rMultiple).toBe(-1);
  });

  it('nến chạm CẢ SL lẫn TP → tính SL (bảo thủ, OHLC không cho biết thứ tự trong nến)', () => {
    const candles = [bar(100, 100, 100, 100, 0), bar(100, 130, 85, 120, 1)];
    const r = resolveBarriers(candles, 0, 100, 10, true, NO_COST);
    expect(r.outcome).toBe('sl');
    expect(r.rMultiple).toBe(-1);
  });

  it('hết maxBars mà chưa chạm rào → đóng theo giá đóng cửa, R từng phần', () => {
    const candles = [
      bar(100, 100, 100, 100, 0),
      bar(100, 104, 98, 103, 1),
      bar(103, 107, 102, 106, 2),
    ];
    const r = resolveBarriers(candles, 0, 100, 10, true, { maxBars: 2, costFraction: 0 });
    expect(r.outcome).toBe('timeout');
    expect(r.rMultiple).toBeCloseTo(0.6, 10); // (106-100)/10
    expect(r.barsHeld).toBe(2);
  });

  it('không còn nến nào phía sau → timeout, 0R, không crash', () => {
    const r = resolveBarriers([bar(100, 100, 100, 100, 0)], 0, 100, 10, true, NO_COST);
    expect(r.outcome).toBe('timeout');
    expect(r.rMultiple).toBe(0);
    expect(r.barsHeld).toBe(0);
  });
});

describe('resolveBarriers — Bán, entry 100, R = 10 (SL 110, TP1 85, TP2 75)', () => {
  it('chạm TP1 xuống dưới → tp1, +1.5R', () => {
    const candles = [bar(100, 100, 100, 100, 0), bar(100, 102, 84, 86, 1)];
    const r = resolveBarriers(candles, 0, 100, 10, false, NO_COST);
    expect(r.outcome).toBe('tp1');
    expect(r.rMultiple).toBeCloseTo(1.5, 10);
    expect(r.mfeR).toBeCloseTo(1.6, 10); // (100-84)/10
    expect(r.maeR).toBeCloseTo(-0.2, 10); // (100-102)/10
  });

  it('chạm SL lên trên → −1R', () => {
    const candles = [bar(100, 100, 100, 100, 0), bar(100, 111, 99, 109, 1)];
    const r = resolveBarriers(candles, 0, 100, 10, false, NO_COST);
    expect(r.outcome).toBe('sl');
  });

  it('timeout có chi phí → R giảm đúng phần chi phí thoát lệnh', () => {
    // Bán, thoát ở close 95 với chi phí 1% → giá thoát hiệu dụng 95*1.01 = 95.95 → (100-95.95)/10.
    const candles = [bar(100, 100, 100, 100, 0), bar(100, 101, 94, 95, 1)];
    const r = resolveBarriers(candles, 0, 100, 10, false, { maxBars: 1, costFraction: 0.01 });
    expect(r.outcome).toBe('timeout');
    expect(r.rMultiple).toBeCloseTo(0.405, 10);
  });
});

describe('labelSignals — tích hợp trên fixture', () => {
  const candles = generateWalk(Date.UTC(2026, 0, 1), 3_600_000, 400, 2000, 7);
  const result = labelSignals(candles, DEFAULT_ANALYSIS_CONFIG);

  it('có gán nhãn được tín hiệu, và mọi bất biến cấu trúc đều đúng', () => {
    expect(result.labeled.length).toBeGreaterThan(0);

    for (const s of result.labeled) {
      const riskDist = Math.abs(s.entry - s.sl);
      expect(riskDist).toBeGreaterThan(0);
      // TP neo đúng bội số R quanh giá vào thật.
      expect(Math.abs(s.tp1 - s.entry)).toBeCloseTo(1.5 * riskDist, 8);
      expect(Math.abs(s.tp2 - s.entry)).toBeCloseTo(2.5 * riskDist, 8);
      // Đúng chiều theo hướng lệnh.
      if (s.direction === 'buy') {
        expect(s.sl).toBeLessThan(s.entry);
        expect(s.tp1).toBeGreaterThan(s.entry);
      } else {
        expect(s.sl).toBeGreaterThan(s.entry);
        expect(s.tp1).toBeLessThan(s.entry);
      }
      // win phải nhất quán với outcome và rMultiple.
      expect(s.win).toBe(s.outcome === 'tp1' || s.outcome === 'tp2');
      if (s.outcome === 'sl') expect(s.rMultiple).toBe(-1);
      if (s.outcome === 'tp1') expect(s.rMultiple).toBeCloseTo(1.5, 10);
      if (s.outcome === 'tp2') expect(s.rMultiple).toBeCloseTo(2.5, 10);
      expect(s.mfeR).toBeGreaterThanOrEqual(0);
      expect(s.maeR).toBeLessThanOrEqual(0);
      expect(s.barsHeld).toBeLessThanOrEqual(DEFAULT_LABEL_OPTIONS.maxBars);
    }
  });

  it('vào lệnh ở MỞ CỬA nến kế (đã cộng chi phí), không phải đóng cửa nến tín hiệu', () => {
    const first = result.labeled[0];
    expect(first).toBeDefined();
    const signalIndex = candles.findIndex((c) => c.ts === first!.ts);
    expect(signalIndex).toBeGreaterThanOrEqual(0);
    const nextOpen = candles[signalIndex + 1]!.open;
    const expected =
      first!.direction === 'buy'
        ? nextOpen * (1 + DEFAULT_LABEL_OPTIONS.costFraction)
        : nextOpen * (1 - DEFAULT_LABEL_OPTIONS.costFraction);
    expect(first!.entry).toBeCloseTo(expected, 10);
    expect(first!.entry).not.toBeCloseTo(candles[signalIndex]!.close, 10);
  });

  it('tín hiệu bị loại được ghi rõ lý do (mẫu đã lọc thế nào là minh bạch)', () => {
    const totalSkipped = Object.values(result.skippedByReason).reduce((a, b) => a + b, 0);
    expect(totalSkipped + result.labeled.length + result.skippedNoFuture).toBeGreaterThan(0);
    for (const reason of Object.keys(result.skippedByReason)) expect(reason).not.toBe('');
  });

  it('chi phí cao hơn → kỳ vọng R không thể tốt hơn (không có bữa trưa miễn phí)', () => {
    const cheap = labelSignals(candles, DEFAULT_ANALYSIS_CONFIG, undefined, {
      maxBars: 60,
      costFraction: 0,
    });
    const pricey = labelSignals(candles, DEFAULT_ANALYSIS_CONFIG, undefined, {
      maxBars: 60,
      costFraction: 0.01,
    });
    const meanR = (xs: { rMultiple: number }[]) =>
      xs.length > 0 ? xs.reduce((a, b) => a + b.rMultiple, 0) / xs.length : 0;
    expect(meanR(pricey.labeled)).toBeLessThanOrEqual(meanR(cheap.labeled) + 1e-9);
  });
});
