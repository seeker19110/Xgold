'use client';

import { useEffect, useState } from 'react';
import type { Candle, Timeframe } from '@/lib/candles/types';
import { INSTRUMENTS, type Instrument } from '@/lib/instruments';
import { DEFAULT_ANALYSIS_CONFIG, suggestLatest, type SignalDirection } from '@/lib/analysis';
import { rsi, sma } from '@/lib/indicators';

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

export interface MarketContextCandles {
  xau1D: Candle[];
  xag1D: Candle[];
  dxy1D: Candle[];
}

export interface ScreenerState {
  status: 'loading' | 'error' | 'success';
  rows: ScreenerRow[];
  /** Nến 1D của XAU/XAG/DXY cho thẻ "Bối cảnh thị trường" (mục 4.2) — `null` khi đang tải. */
  marketContext: MarketContextCandles | null;
  error: string | null;
}

interface CandlesFetchResult {
  instrument: Instrument;
  candles: Candle[];
  source: 'supabase' | 'sample';
}

async function fetchInstrumentCandles(
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

function emptyRow(instrument: Instrument): ScreenerRow {
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

function rowFromCandles(
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
 * Quét tín hiệu MỌI mã trong registry ở MỘT khung chọn được, dùng `DEFAULT_ANALYSIS_CONFIG` (v1
 * không có panel chỉnh cấu hình trên screener — Đợt 10 mục 3.2). Một mã lỗi/rỗng chỉ làm dòng đó
 * hiện "—", không hỏng cả bảng; trạng thái tổng "error" chỉ khi TẤT CẢ mã lỗi.
 */
export function useScreener(timeframe: Timeframe): ScreenerState {
  const [state, setState] = useState<ScreenerState>({
    status: 'loading',
    rows: [],
    marketContext: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading', rows: [], marketContext: null, error: null });

    async function load() {
      const settled = await Promise.allSettled(
        INSTRUMENTS.map((instrument) => fetchInstrumentCandles(instrument, timeframe)),
      );
      if (cancelled) return;

      const allFailed = settled.every((r) => r.status === 'rejected');
      if (allFailed) {
        const firstError = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        setState({
          status: 'error',
          rows: [],
          marketContext: null,
          error:
            firstError?.reason instanceof Error
              ? firstError.reason.message
              : String(firstError?.reason),
        });
        return;
      }

      const rows = settled.map((result, i) => {
        const instrument = INSTRUMENTS[i];
        if (!instrument) throw new Error('registry index lệch — không thể xảy ra');
        if (result.status === 'rejected') return emptyRow(instrument);
        return rowFromCandles(instrument, result.value.candles, result.value.source);
      });

      // Thẻ bối cảnh thị trường cần 1D của XAU/XAG/DXY — tái dùng nếu screener đang ở khung 1D
      // (không fetch trùng), chỉ fetch riêng khi khung đang chọn khác 1D.
      const bySymbol1D = new Map<string, Candle[]>();
      if (timeframe === '1D') {
        for (const result of settled) {
          if (result.status === 'fulfilled') {
            bySymbol1D.set(result.value.instrument.symbol, result.value.candles);
          }
        }
      } else {
        const contextInstruments = ['XAUUSD', 'XAGUSD', 'DXY']
          .map((symbol) => INSTRUMENTS.find((i) => i.symbol === symbol))
          .filter((i): i is Instrument => i !== undefined);
        const contextSettled = await Promise.allSettled(
          contextInstruments.map((instrument) => fetchInstrumentCandles(instrument, '1D')),
        );
        if (cancelled) return;
        for (const result of contextSettled) {
          if (result.status === 'fulfilled') {
            bySymbol1D.set(result.value.instrument.symbol, result.value.candles);
          }
        }
      }

      setState({
        status: 'success',
        rows,
        marketContext: {
          xau1D: bySymbol1D.get('XAUUSD') ?? [],
          xag1D: bySymbol1D.get('XAGUSD') ?? [],
          dxy1D: bySymbol1D.get('DXY') ?? [],
        },
        error: null,
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  return state;
}
