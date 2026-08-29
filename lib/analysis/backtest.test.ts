import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { evaluatePerformance, summarizeSignalHistory, walkForward } from '@/lib/analysis/backtest';
import { DEFAULT_ANALYSIS_CONFIG } from '@/lib/analysis/config';
import { labelSignals } from '@/lib/analysis/labeling';
import { generateWalk } from '@/lib/fixtures/generate';
import type { AnalysisConfig } from '@/lib/analysis/config';
import { DEFAULT_ANALYSIS_PARAMS, RULE_IDS, type AnalysisParams } from '@/lib/analysis/types';

/** Chỉ bật price-vs-ma trọng số 1 — chuỗi sự kiện đã tính tay ở combine.test.ts (signalEvents). */
const PRICE_VS_MA_ONLY_CONFIG: AnalysisConfig = {
  enabled: true,
  combineMode: 'linear',
  regimeAware: false,
  smoothingSpan: 0,
  buyThreshold: 0.5,
  rules: Object.fromEntries(
    RULE_IDS.map((id) => [
      id,
      { enabled: id === 'price-vs-ma', weight: id === 'price-vs-ma' ? 1 : 0 },
    ]),
  ) as AnalysisConfig['rules'],
};

const P: AnalysisParams = { ...DEFAULT_ANALYSIS_PARAMS, maSlowPeriod: 3 };

function candleAt(iso: string, close: number): Candle {
  return { ts: iso, open: close, high: close, low: close, close, volume: null };
}

describe('summarizeSignalHistory', () => {
  it('đếm đúng số sự kiện và phân bố theo năm UTC — chuỗi price-vs-ma tính tay', () => {
    // [1,2,3,1] với SMA3: Mua tại nến thứ 3 (năm 2025), Bán tại nến thứ 4 (năm 2026).
    const candles = [
      candleAt('2025-12-29T00:00:00.000Z', 1),
      candleAt('2025-12-30T00:00:00.000Z', 2),
      candleAt('2025-12-31T00:00:00.000Z', 3),
      candleAt('2026-01-01T00:00:00.000Z', 1),
    ];

    const summary = summarizeSignalHistory(candles, PRICE_VS_MA_ONLY_CONFIG, P);
    expect(summary.totalSell).toBe(1);
    expect(summary.totalBuy).toBe(1);
    expect(summary.byYear).toEqual({
      '2025': { buy: 1, sell: 0 },
      '2026': { buy: 0, sell: 1 },
    });
    expect(summary.events).toHaveLength(2);
  });

  it('không có nến → thống kê rỗng', () => {
    const summary = summarizeSignalHistory([], PRICE_VS_MA_ONLY_CONFIG, P);
    expect(summary).toEqual({ totalBuy: 0, totalSell: 0, byYear: {}, events: [] });
  });
});

describe('evaluatePerformance (Đợt B)', () => {
  const candles = generateWalk(Date.UTC(2026, 0, 1), 3_600_000, 600, 2000, 11);
  const report = evaluatePerformance(candles, DEFAULT_ANALYSIS_CONFIG);

  it('đếm khớp với số nhãn thật và các kết cục cộng lại đúng bằng số tín hiệu', () => {
    const { labeled } = labelSignals(candles, DEFAULT_ANALYSIS_CONFIG);
    expect(report.signals).toBe(labeled.length);
    const sumOutcomes =
      report.outcomes.tp1 + report.outcomes.tp2 + report.outcomes.sl + report.outcomes.timeout;
    expect(sumOutcomes).toBe(report.signals);
    expect(report.wins).toBe(report.outcomes.tp1 + report.outcomes.tp2);
  });

  it('hitRate và expectancyR khớp định nghĩa (tính lại từ nhãn thô)', () => {
    const { labeled } = labelSignals(candles, DEFAULT_ANALYSIS_CONFIG);
    const wins = labeled.filter((s) => s.win).length;
    expect(report.hitRate).toBeCloseTo(wins / labeled.length, 10);
    expect(report.expectancyR).toBeCloseTo(
      labeled.reduce((a, b) => a + b.rMultiple, 0) / labeled.length,
      10,
    );
    expect(report.totalR).toBeCloseTo(
      labeled.reduce((a, b) => a + b.rMultiple, 0),
      8,
    );
  });

  it('MFE luôn ≥ 0 và MAE luôn ≤ 0 theo định nghĩa', () => {
    expect(report.avgMfeR!).toBeGreaterThanOrEqual(0);
    expect(report.avgMaeR!).toBeLessThanOrEqual(0);
  });

  it('không có tín hiệu nào → mọi tỷ lệ là null, không chia 0', () => {
    const empty = evaluatePerformance([], DEFAULT_ANALYSIS_CONFIG);
    expect(empty.signals).toBe(0);
    expect(empty.hitRate).toBeNull();
    expect(empty.expectancyR).toBeNull();
    expect(empty.avgMfeR).toBeNull();
  });
});

describe('walkForward (Đợt B)', () => {
  const candles = generateWalk(Date.UTC(2026, 0, 1), 3_600_000, 900, 2000, 13);

  it('mỗi fold hiệu chuẩn trên quá khứ và chấm trên đoạn SAU đó (không tự chấm mình)', () => {
    const report = walkForward(
      candles,
      DEFAULT_ANALYSIS_CONFIG,
      undefined,
      undefined,
      undefined,
      3,
    );
    expect(report.folds.length).toBeGreaterThan(0);
    let prevTrain = 0;
    for (const fold of report.folds) {
      expect(fold.trainSignals).toBeGreaterThan(prevTrain);
      expect(fold.testSignals).toBeGreaterThan(0);
      // Tập huấn luyện chỉ gồm tín hiệu TRƯỚC tập test → tổng không vượt quá tổng nhãn.
      expect(fold.trainSignals + fold.testSignals).toBeLessThanOrEqual(
        labelSignals(candles, DEFAULT_ANALYSIS_CONFIG).labeled.length,
      );
      prevTrain = fold.trainSignals;
      if (fold.brier !== null) {
        expect(fold.brier).toBeGreaterThanOrEqual(0);
        expect(fold.brier).toBeLessThanOrEqual(1);
      }
    }
  });

  it('meanBrier là null khi không fold nào đủ mẫu để chấm, không phải 0 giả', () => {
    // Ngưỡng mẫu cao ngất → không khoang nào đủ → không chấm được tín hiệu nào.
    const report = walkForward(
      candles,
      DEFAULT_ANALYSIS_CONFIG,
      undefined,
      undefined,
      { bins: 5, minBinSample: 10_000 },
      3,
    );
    expect(report.totalScored).toBe(0);
    expect(report.meanBrier).toBeNull();
  });

  it('folds < 2 vẫn chạy được (tự nâng lên 2), không crash', () => {
    const report = walkForward(
      candles,
      DEFAULT_ANALYSIS_CONFIG,
      undefined,
      undefined,
      undefined,
      1,
    );
    expect(report.folds.length).toBeGreaterThanOrEqual(1);
  });
});
