import type { Candle } from '@/lib/candles/types';

const CSV_HEADER = 'time,open,high,low,close,volume';

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Sinh nội dung CSV (kèm dòng tiêu đề) từ danh sách nến — dùng chung cho export UI và test. */
export function candlesToCsv(candles: readonly Candle[]): string {
  const rows = candles.map((c) =>
    [c.ts, c.open, c.high, c.low, c.close, c.volume ?? '']
      .map((v) => escapeCell(String(v)))
      .join(','),
  );
  return [CSV_HEADER, ...rows].join('\n');
}

/** Tên file export gợi ý, vd "xauusd-1h-candles.csv". */
export function candlesCsvFileName(symbol: string, timeframe: string): string {
  return `${symbol.toLowerCase()}-${timeframe}-candles.csv`;
}
