'use client';

import { useEffect, useState } from 'react';
import { compareGoldPrice, type GoldPriceComparisonRow } from '@/lib/gold-compare/convert';
import type { Candle } from '@/lib/candles/types';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

export interface GoldCompareState {
  status: 'loading' | 'error' | 'success';
  rows: GoldPriceComparisonRow[];
  /** `ts` nến XAU/USD + USD/VND mới nhất dùng làm mốc quy đổi (hiển thị "tính theo giá lúc…"). */
  worldAsOfTs: string | null;
  error: string | null;
}

interface CandlesResponse {
  candles: Candle[];
}

interface DomesticGoldResponse {
  prices: DomesticGoldPrice[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/** Nến đóng cửa GẦN NHẤT của khung 1D — mảng đã sắp tăng dần theo `ts` (quy ước /api/candles). */
function latestClose(candles: readonly Candle[]): { close: number; ts: string } | null {
  const last = candles.at(-1);
  return last ? { close: last.close, ts: last.ts } : null;
}

/**
 * Gộp 3 nguồn: giá vàng trong nước (`/api/domestic-gold`) + nến XAU/USD 1D + nến USD/VND 1D, quy đổi
 * giá thế giới sang VND/lượng rồi so sánh với từng dòng giá trong nước. Thiếu bất kỳ nguồn nào (chưa
 * đủ dữ liệu, kể cả ở chế độ mẫu) → không đoán, trả `rows` rỗng thay vì tính sai.
 */
export function useGoldCompare(): GoldCompareState {
  const [state, setState] = useState<GoldCompareState>({
    status: 'loading',
    rows: [],
    worldAsOfTs: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [domestic, xauusd, usdvnd] = await Promise.all([
          fetchJson<DomesticGoldResponse>('/api/domestic-gold'),
          fetchJson<CandlesResponse>('/api/candles?symbol=XAUUSD&timeframe=1D'),
          fetchJson<CandlesResponse>('/api/candles?symbol=USDVND&timeframe=1D'),
        ]);
        if (cancelled) return;

        const xauLatest = latestClose(xauusd.candles);
        const usdvndLatest = latestClose(usdvnd.candles);

        if (!xauLatest || !usdvndLatest) {
          setState({ status: 'success', rows: [], worldAsOfTs: null, error: null });
          return;
        }

        const world = { xauUsdPerOz: xauLatest.close, usdVndRate: usdvndLatest.close };
        const rows = domestic.prices.map((p) => compareGoldPrice(p, world));
        // Mốc thời gian giá thế giới dùng để quy đổi = nến CŨ HƠN trong 2 nến (thận trọng: không ghi
        // nhãn "mới hơn" thực tế của nó nếu 1 trong 2 nguồn chậm cập nhật hơn).
        const worldAsOfTs =
          Date.parse(xauLatest.ts) <= Date.parse(usdvndLatest.ts) ? xauLatest.ts : usdvndLatest.ts;

        setState({ status: 'success', rows, worldAsOfTs, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          rows: [],
          worldAsOfTs: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
