'use client';

import { useEffect, useState } from 'react';
import type { Candle, Timeframe } from '@/lib/candles/types';

export interface CompareCandlesState {
  /** 'idle' = chưa chọn mã so sánh (không fetch). Bốn trạng thái còn lại như `useCandles`. */
  status: 'idle' | 'loading' | 'error' | 'success';
  candles: Candle[];
  source: 'supabase' | 'sample' | null;
  error: string | null;
}

const IDLE_STATE: CompareCandlesState = {
  status: 'idle',
  candles: [],
  source: null,
  error: null,
};

/**
 * Biến thể của `useCandles` cho MÃ SO SÁNH (W-507): `symbol` có thể `null` (chưa chọn) → trạng thái
 * `idle`, KHÔNG gọi `/api/candles`. Cùng khuôn `{status, candles, source, error}` để UI render đủ
 * trạng thái. Tự hủy kết quả cũ khi `symbol`/`timeframe` đổi trước khi fetch xong (tránh race).
 */
export function useCompareCandles(
  symbol: string | null,
  timeframe: Timeframe,
): CompareCandlesState {
  const [state, setState] = useState<CompareCandlesState>(IDLE_STATE);

  useEffect(() => {
    if (symbol === null) {
      // Bỏ chọn mã so sánh: về idle (không fetch). setState trong effect ở đây là đồng bộ trạng
      // thái với prop `symbol` vừa đổi — cùng lý do đã ghi ở use-candles.ts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(IDLE_STATE);
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', candles: [], source: null, error: null });

    const params = new URLSearchParams({ symbol, timeframe });
    fetch(`/api/candles?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => ({}));
          const message =
            typeof body === 'object' && body !== null && 'error' in body
              ? String((body as { error: unknown }).error)
              : `HTTP ${res.status}`;
          throw new Error(message);
        }
        return res.json() as Promise<{
          candles: Candle[];
          source: 'supabase' | 'sample';
        }>;
      })
      .then((body) => {
        if (cancelled) return;
        setState({ status: 'success', candles: body.candles, source: body.source, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          candles: [],
          source: null,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  return state;
}
