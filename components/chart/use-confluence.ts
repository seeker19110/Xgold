'use client';

import { useEffect, useState } from 'react';
import type { Candle } from '@/lib/candles/types';
import { resample } from '@/lib/candles/resample';
import { computeConfluence, type AnalysisConfig, type Confluence } from '@/lib/analysis';

export interface ConfluenceState {
  status: 'loading' | 'error' | 'success';
  confluence: Confluence | null;
  error: string | null;
}

interface CandlesResponse {
  candles: Candle[];
}

async function fetchCandles(symbol: string, timeframe: '1h' | '1D'): Promise<Candle[]> {
  const params = new URLSearchParams({ symbol, timeframe });
  const res = await fetch(`/api/candles?${params.toString()}`);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  const body = (await res.json()) as CandlesResponse;
  return body.candles;
}

/**
 * Hợp lưu tín hiệu đa khung (1h/4h/1D/1W) cho MỘT mã đang xem trên trang chart — chỉ fetch 1h + 1D,
 * suy 4h/1W bằng `resample` (Đợt 10 mục 2.2, không gọi thêm API). Dùng đúng `config` (bộ quy tắc)
 * người dùng đang đặt trên trang chart để khớp những gì họ đang thấy ở `analysis-panel`.
 */
export function useConfluence(symbol: string, config: AnalysisConfig): ConfluenceState {
  const [state, setState] = useState<ConfluenceState>({
    status: 'loading',
    confluence: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading', confluence: null, error: null });

    async function load() {
      try {
        const [hourly, daily] = await Promise.all([
          fetchCandles(symbol, '1h'),
          fetchCandles(symbol, '1D'),
        ]);
        if (cancelled) return;

        const confluence = computeConfluence(
          {
            '1h': hourly,
            '4h': resample(hourly, '4h'),
            '1D': daily,
            '1W': resample(daily, '1W'),
          },
          config,
        );
        setState({ status: 'success', confluence, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          confluence: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [symbol, config]);

  return state;
}
