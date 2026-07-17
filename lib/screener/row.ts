import type { Candle, Timeframe } from '@/lib/candles/types';
import type { Instrument } from '@/lib/instruments';
import { DEFAULT_ANALYSIS_CONFIG, suggestLatest, type SignalDirection } from '@/lib/analysis';
import { rsi, sma } from '@/lib/indicators';

/**
 * Logic dựng một dòng "giá + tín hiệu" cho MỘT mã ở MỘT khung — tách khỏi `use-screener.ts` (Đợt 10)
 * để dùng lại cho Watchlist (W-509, Đợt 15) mà KHÔNG viết lại phần tính giá/RSI/xu hướng/gợi ý.
 * Nguồn sự thật duy nhất cho `ScreenerRow`, `emptyRow`, `rowFromCandles`, `fetchInstrumentCandles`.
 */
export interface ScreenerRow {
  symbol: string;
  slug: string;
  label: string;
  currency: Instrument['currency'];
  /** `null` nếu mã đó lỗi/rỗng — hiển thị "—", không làm hỏng cả bảng. */
  latestClose: number | null;
  direction: SignalDirection | null;
  /** `score/maxScore`, dải −1..+1; 0 nếu không có gợi ý. */
  norm: number;
  rsi14: number | null;
  /** 'up'/'down' so với SMA200; `null` nếu thiếu dữ liệu. */
  trend: 'up' | 'down' | null;
  source: 'supabase' | 'sample' | null;
}

export interface CandlesFetchResult {
  instrument: Instrument;
  candles: Candle[];
  source: 'supabase' | 'sample';
}

/** Gọi `/api/candles` cho 1 mã ở 1 khung; ném lỗi có thông điệp đọc được nếu HTTP không ok. */
export async function fetchInstrumentCandles(
  instrument: Instrument,
  timeframe: Timeframe,
): Promise<CandlesFetchResult> {
  const params = new URLSearchParams({ symbol: instrument.symbol, timeframe });
  const res = await fetch(`/api/candles?${params.toString()}`);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  const body = (await res.json()) as { candles: Candle[]; source: 'supabase' | 'sample' };
  return { instrument, candles: body.candles, source: body.source };
}

/** Dòng "trống" cho mã lỗi/rỗng — mọi trường số/tín hiệu về `null`/0, chỉ giữ metadata mã. */
export function emptyRow(instrument: Instrument): ScreenerRow {
  return {
    symbol: instrument.symbol,
    slug: instrument.slug,
    label: instrument.label,
    currency: instrument.currency,
    latestClose: null,
    direction: null,
    norm: 0,
    rsi14: null,
    trend: null,
    source: null,
  };
}

/** Dựng dòng đầy đủ từ nến: giá cuối, gợi ý Mua/Bán/Trung lập + độ mạnh, RSI(14), xu hướng vs SMA200. */
export function rowFromCandles(
  instrument: Instrument,
  candles: Candle[],
  source: 'supabase' | 'sample',
): ScreenerRow {
  const latest = candles.at(-1) ?? null;
  const suggestion = suggestLatest(candles, DEFAULT_ANALYSIS_CONFIG);
  const norm = suggestion && suggestion.maxScore > 0 ? suggestion.score / suggestion.maxScore : 0;

  const rsiPoint = rsi(candles, 14).at(-1) ?? null;
  const smaPoint = sma(candles, 200).at(-1) ?? null;
  const trend: ScreenerRow['trend'] =
    latest && smaPoint?.value != null ? (latest.close >= smaPoint.value ? 'up' : 'down') : null;

  return {
    symbol: instrument.symbol,
    slug: instrument.slug,
    label: instrument.label,
    currency: instrument.currency,
    latestClose: latest?.close ?? null,
    direction: suggestion?.direction ?? null,
    norm,
    rsi14: rsiPoint?.value ?? null,
    trend,
    source,
  };
}

/**
 * Biến thiên % giữa nến cuối và nến liền trước (dùng cho cột ±% của Watchlist). `null` khi thiếu nến
 * (<2) hoặc nến trước có giá đóng 0 (tránh chia cho 0). KHÔNG dùng để tính lời/lỗ tài chính — chỉ là
 * chỉ báo thay đổi trực quan trên danh sách theo dõi.
 */
export function changePercentFromCandles(candles: Candle[]): number | null {
  const latest = candles.at(-1);
  const previous = candles.at(-2);
  if (!latest || !previous || previous.close === 0) return null;
  return ((latest.close - previous.close) / previous.close) * 100;
}
