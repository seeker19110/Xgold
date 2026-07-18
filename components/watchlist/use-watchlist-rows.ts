'use client';

import { useEffect, useState } from 'react';
import type { Timeframe } from '@/lib/candles/types';
import { getInstrumentBySymbol, type Instrument } from '@/lib/instruments';
import {
  changePercentFromCandles,
  emptyRow,
  fetchInstrumentCandles,
  rowFromCandles,
  type ScreenerRow,
} from '@/lib/screener/row';

/** Dòng watchlist = dòng screener + biến thiên % so với nến trước (cột riêng của watchlist). */
export interface WatchlistRow extends ScreenerRow {
  changePercent: number | null;
}

export interface WatchlistRowsState {
  /** `idle` khi chưa ghim mã nào (không fetch). Còn lại như các hook fetch khác. */
  status: 'idle' | 'loading' | 'error' | 'success';
  rows: WatchlistRow[];
  error: string | null;
}

/**
 * Fetch giá + tín hiệu cho MỌI mã đã ghim ở CÙNG một khung (khớp khung đang xem trên chart). Tái
 * dùng nguyên `fetchInstrumentCandles`/`rowFromCandles`/`emptyRow` của screener (không viết lại
 * logic RSI/xu hướng/tín hiệu), thêm `changePercent`. Một mã lỗi → dòng đó "—" (emptyRow); CHỈ khi
 * TẤT CẢ mã lỗi mới báo `error`. Đổi danh sách/khung → hủy request cũ (chống race).
 *
 * Phụ thuộc theo `symbols.join(',')` (chuỗi ổn định) thay vì tham chiếu mảng — tránh fetch lại thừa
 * khi mảng cùng nội dung nhưng khác tham chiếu giữa các lần render.
 */
export function useWatchlistRows(
  symbols: readonly string[],
  timeframe: Timeframe,
): WatchlistRowsState {
  const [state, setState] = useState<WatchlistRowsState>({
    status: 'idle',
    rows: [],
    error: null,
  });

  const symbolsKey = symbols.join(',');

  useEffect(() => {
    const instruments = (symbolsKey === '' ? [] : symbolsKey.split(','))
      .map((symbol) => getInstrumentBySymbol(symbol))
      .filter((instrument): instrument is Instrument => instrument !== undefined);

    if (instruments.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'idle', rows: [], error: null });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', rows: [], error: null });

    async function load() {
      const settled = await Promise.allSettled(
        instruments.map((instrument) => fetchInstrumentCandles(instrument, timeframe)),
      );
      if (cancelled) return;

      const allFailed = settled.every((r) => r.status === 'rejected');
      if (allFailed) {
        const firstError = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        setState({
          status: 'error',
          rows: [],
          error:
            firstError?.reason instanceof Error
              ? firstError.reason.message
              : String(firstError?.reason),
        });
        return;
      }

      const rows = settled.map((result, i): WatchlistRow => {
        const instrument = instruments[i];
        if (!instrument) throw new Error('watchlist index lệch — không thể xảy ra');
        if (result.status === 'rejected') {
          return { ...emptyRow(instrument), changePercent: null };
        }
        return {
          ...rowFromCandles(instrument, result.value.candles, result.value.source),
          changePercent: changePercentFromCandles(result.value.candles),
        };
      });

      setState({ status: 'success', rows, error: null });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [symbolsKey, timeframe]);

  return state;
}
