import type { BaseTimeframe, Candle } from '@/lib/candles/types';

export interface FetchCandlesParams {
  /** Symbol nội bộ Xgold, vd 'XAUUSD' — mỗi adapter tự map sang định dạng của provider. */
  symbol: string;
  timeframe: BaseTimeframe;
  /** Số nến tối đa muốn lấy (mặc định do adapter quyết định). */
  outputsize?: number;
  /** Backfill từ ngày này (UTC, 'YYYY-MM-DD') — tùy provider có hỗ trợ hay không. */
  startDate?: string;
}

export interface CandleProvider {
  readonly name: string;
  fetchCandles(params: FetchCandlesParams): Promise<Candle[]>;
}

/** Lỗi có cấu trúc khi provider trả lỗi hoặc dữ liệu không hợp lệ — ghi rõ vào `ingest_runs.error`. */
export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}
