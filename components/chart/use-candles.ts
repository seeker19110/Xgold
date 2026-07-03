'use client';

import { useEffect, useState } from 'react';
import type { Candle, Timeframe } from '@/lib/candles/types';

export interface CandlesState {
  status: 'loading' | 'error' | 'success';
  candles: Candle[];
  source: 'supabase' | 'sample' | null;
  error: string | null;
}

/** Gọi `/api/candles`, tự hủy kết quả cũ khi `symbol`/`timeframe` đổi trước khi fetch xong. */
export function useCandles(symbol: string, timeframe: Timeframe): CandlesState {
  const [state, setState] = useState<CandlesState>({
    status: 'loading',
    candles: [],
    source: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    // Đặt lại trạng thái "đang tải" NGAY khi symbol/timeframe đổi (phản hồi tức thì cho người dùng
    // khi bấm chuyển khung) — cascading render 1 lần là đánh đổi chấp nhận được, không phải setState
    // đồng bộ với dữ liệu từ effect trước (khác lỗi thật mà rule này nhắm tới).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
