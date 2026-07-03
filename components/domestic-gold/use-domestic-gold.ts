'use client';

import { useEffect, useState } from 'react';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

export interface DomesticGoldState {
  status: 'loading' | 'error' | 'success';
  prices: DomesticGoldPrice[];
  source: 'supabase' | 'sample' | null;
  error: string | null;
}

/** "Gần realtime" theo PROJECT.md mục 2 (Should have) — polling đơn giản hơn Supabase Realtime,
 * đủ cho tần suất cập nhật giá vàng trong nước (không đổi mỗi giây). */
const POLL_INTERVAL_MS = 60_000;

interface DomesticGoldResponse {
  prices: DomesticGoldPrice[];
  source: 'supabase' | 'sample';
}

async function fetchPrices(vendor?: string): Promise<DomesticGoldResponse> {
  const params = vendor ? `?${new URLSearchParams({ vendor }).toString()}` : '';
  const res = await fetch(`/api/domestic-gold${params}`);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<DomesticGoldResponse>;
}

/** Gọi `/api/domestic-gold`, tự poll lại mỗi 60s. Poll thất bại KHÔNG xóa dữ liệu đang hiển thị (chỉ
 * lần tải ĐẦU TIÊN thất bại mới chuyển sang trạng thái lỗi toàn màn hình). */
export function useDomesticGold(vendor?: string): DomesticGoldState {
  const [state, setState] = useState<DomesticGoldState>({
    status: 'loading',
    prices: [],
    source: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading', prices: [], source: null, error: null });

    async function load() {
      try {
        const body = await fetchPrices(vendor);
        if (cancelled) return;
        setState({ status: 'success', prices: body.prices, source: body.source, error: null });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState((prev) =>
          prev.status === 'success'
            ? prev
            : { status: 'error', prices: [], source: null, error: message },
        );
      }
    }

    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vendor]);

  return state;
}
