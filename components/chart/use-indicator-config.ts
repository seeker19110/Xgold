'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_CHART_CONFIG,
  decodeChartConfig,
  encodeChartConfig,
  type ChartConfig,
} from '@/lib/indicators/config';

const STORAGE_KEY = 'xgold:chart-config';
const URL_PARAM = 'cfg';

function readPersistedConfig(): ChartConfig {
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get(URL_PARAM);
  if (fromUrl) {
    const decoded = decodeChartConfig(fromUrl);
    if (decoded) return decoded;
  }

  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  if (fromStorage) {
    const decoded = decodeChartConfig(fromStorage);
    if (decoded) return decoded;
  }

  return DEFAULT_CHART_CONFIG;
}

/**
 * Cấu hình Multi-MA/Multi-RSI, lưu localStorage + đồng bộ URL (`?cfg=...`) để chia sẻ được.
 * Bắt đầu bằng DEFAULT_CHART_CONFIG (khớp cả server lẫn client) rồi đọc giá trị thật đã lưu SAU
 * mount — localStorage/URL chỉ có ở client, đọc ngay trong lazy initializer sẽ lệch hydrate.
 */
export function useIndicatorConfig(): readonly [ChartConfig, (config: ChartConfig) => void] {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CHART_CONFIG);
  // Chặn effect ghi localStorage/URL chạy TRƯỚC KHI effect đọc cấu hình đã lưu kịp áp dụng — thiếu
  // cờ này, lần mount đầu ghi đè tạm thời DEFAULT_CHART_CONFIG lên localStorage/URL (tự sửa lại
  // ngay trong cùng tick nên không thấy được, nhưng vẫn là 1 lần ghi thừa/logic dễ vỡ). F-005,
  // docs/ops/COMPLETION-PLAN.md W-301.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(readPersistedConfig());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const encoded = encodeChartConfig(config);
    window.localStorage.setItem(STORAGE_KEY, encoded);

    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, encoded);
    window.history.replaceState(null, '', url.toString());
  }, [config, isHydrated]);

  return [config, setConfig] as const;
}
