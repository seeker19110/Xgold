import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { summarizeSignalHistory } from '@/lib/analysis/backtest';
import type { AnalysisConfig } from '@/lib/analysis/config';
import { DEFAULT_ANALYSIS_PARAMS, RULE_IDS, type AnalysisParams } from '@/lib/analysis/types';

/** Chỉ bật rsi-zone trọng số 1 — chuỗi sự kiện đã tính tay ở combine.test.ts (signalEvents). */
const RSI_ONLY_CONFIG: AnalysisConfig = {
  enabled: true,
  buyThreshold: 0.5,
  rules: Object.fromEntries(
    RULE_IDS.map((id) => [id, { enabled: id === 'rsi-zone', weight: id === 'rsi-zone' ? 1 : 0 }]),
  ) as AnalysisConfig['rules'],
};

const P: AnalysisParams = { ...DEFAULT_ANALYSIS_PARAMS, rsiPeriod: 2 };

function candleAt(iso: string, close: number): Candle {
  return { ts: iso, open: close, high: close, low: close, close, volume: null };
}

describe('summarizeSignalHistory', () => {
  it('đếm đúng số sự kiện và phân bố theo năm UTC — chuỗi RSI(2) tính tay [null,null,100,25]', () => {
    // Sự kiện: Bán tại nến thứ 3 (năm 2025), Mua tại nến thứ 4 (năm 2026) — xem combine.test.ts.
    const candles = [
      candleAt('2025-12-29T00:00:00.000Z', 44),
      candleAt('2025-12-30T00:00:00.000Z', 44.25),
      candleAt('2025-12-31T00:00:00.000Z', 44.5),
      candleAt('2026-01-01T00:00:00.000Z', 43.75),
    ];

    const summary = summarizeSignalHistory(candles, RSI_ONLY_CONFIG, P);
    expect(summary.totalSell).toBe(1);
    expect(summary.totalBuy).toBe(1);
    expect(summary.byYear).toEqual({
      '2025': { buy: 0, sell: 1 },
      '2026': { buy: 1, sell: 0 },
    });
    expect(summary.events).toHaveLength(2);
  });

  it('không có nến → thống kê rỗng', () => {
    const summary = summarizeSignalHistory([], RSI_ONLY_CONFIG, P);
    expect(summary).toEqual({ totalBuy: 0, totalSell: 0, byYear: {}, events: [] });
  });
});
