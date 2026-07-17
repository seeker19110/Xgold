import { describe, expect, it } from 'vitest';
import type { Candle } from '@/lib/candles/types';
import { getInstrumentBySymbol, type Instrument } from '@/lib/instruments';
import { changePercentFromCandles, emptyRow, rowFromCandles } from '@/lib/screener/row';

function instrument(symbol: string): Instrument {
  const found = getInstrumentBySymbol(symbol);
  if (!found) throw new Error(`fixture cần mã hợp lệ: ${symbol}`);
  return found;
}

function candle(ts: string, close: number): Candle {
  return { ts, open: close, high: close, low: close, close, volume: null };
}

describe('emptyRow', () => {
  it('giữ metadata mã, mọi trường số/tín hiệu về null/0', () => {
    const row = emptyRow(instrument('XAUUSD'));
    expect(row.symbol).toBe('XAUUSD');
    expect(row.slug).toBe('xauusd');
    expect(row.latestClose).toBeNull();
    expect(row.direction).toBeNull();
    expect(row.norm).toBe(0);
    expect(row.rsi14).toBeNull();
    expect(row.trend).toBeNull();
    expect(row.source).toBeNull();
  });
});

describe('rowFromCandles', () => {
  it('lấy giá đóng của nến cuối làm latestClose, gắn source', () => {
    const candles = Array.from({ length: 5 }, (_, i) =>
      candle(`2026-01-0${i + 1}T00:00:00.000Z`, 100 + i),
    );
    const row = rowFromCandles(instrument('XAUUSD'), candles, 'sample');
    expect(row.latestClose).toBe(104);
    expect(row.source).toBe('sample');
  });

  it('nến rỗng → latestClose null, không throw', () => {
    const row = rowFromCandles(instrument('XAGUSD'), [], 'supabase');
    expect(row.latestClose).toBeNull();
    expect(row.trend).toBeNull();
  });
});

describe('changePercentFromCandles', () => {
  it('tính % giữa nến cuối và nến liền trước', () => {
    const candles = [
      candle('2026-01-01T00:00:00.000Z', 100),
      candle('2026-01-02T00:00:00.000Z', 110),
    ];
    expect(changePercentFromCandles(candles)).toBeCloseTo(10, 10);
  });

  it('giảm giá → % âm', () => {
    const candles = [
      candle('2026-01-01T00:00:00.000Z', 200),
      candle('2026-01-02T00:00:00.000Z', 150),
    ];
    expect(changePercentFromCandles(candles)).toBeCloseTo(-25, 10);
  });

  it('ít hơn 2 nến → null', () => {
    expect(changePercentFromCandles([])).toBeNull();
    expect(changePercentFromCandles([candle('2026-01-01T00:00:00.000Z', 100)])).toBeNull();
  });

  it('nến trước có giá đóng 0 → null (không chia cho 0)', () => {
    const candles = [
      candle('2026-01-01T00:00:00.000Z', 0),
      candle('2026-01-02T00:00:00.000Z', 100),
    ];
    expect(changePercentFromCandles(candles)).toBeNull();
  });
});
