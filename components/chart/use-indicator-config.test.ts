import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useIndicatorConfig } from '@/components/chart/use-indicator-config';
import { DEFAULT_CHART_CONFIG, encodeChartConfig, type ChartConfig } from '@/lib/indicators/config';

function makeConfig(overrides: Partial<ChartConfig>): ChartConfig {
  return { ...DEFAULT_CHART_CONFIG, ...overrides };
}

function setUrl(search: string) {
  window.history.replaceState(null, '', `/chart/xauusd${search}`);
}

describe('useIndicatorConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    setUrl('');
  });

  it('bắt đầu bằng DEFAULT_CHART_CONFIG (khớp SSR) trước khi effect chạy', () => {
    const { result } = renderHook(() => useIndicatorConfig());
    expect(result.current[0]).toEqual(DEFAULT_CHART_CONFIG);
  });

  it('khôi phục cấu hình đã lưu ở localStorage sau mount', async () => {
    const saved = makeConfig({
      maLines: [{ id: 'ma-1', type: 'EMA', period: 9, color: '#ffffff', visible: true }],
      rsiLines: [],
    });
    localStorage.setItem('xgold:chart-config', encodeChartConfig(saved));

    const { result } = renderHook(() => useIndicatorConfig());
    await waitFor(() => expect(result.current[0]).toEqual(saved));
  });

  it('ưu tiên cấu hình từ URL `?cfg=` hơn localStorage khi cả hai đều có', async () => {
    const fromUrl = makeConfig({ maLines: [], rsiLines: [] });
    const fromStorage = makeConfig({
      maLines: [{ id: 'ma-x', type: 'SMA', period: 5, color: '#000000', visible: true }],
      rsiLines: [],
    });
    localStorage.setItem('xgold:chart-config', encodeChartConfig(fromStorage));
    setUrl(`?cfg=${encodeChartConfig(fromUrl)}`);

    const { result } = renderHook(() => useIndicatorConfig());
    await waitFor(() => expect(result.current[0]).toEqual(fromUrl));
  });

  it('cfg hỏng trong URL (bị sửa tay) rơi về localStorage rồi về DEFAULT, không crash', async () => {
    setUrl('?cfg=%%%khong-hop-le%%%');

    const { result } = renderHook(() => useIndicatorConfig());
    await waitFor(() => expect(result.current[0]).toEqual(DEFAULT_CHART_CONFIG));
  });

  it('không ghi đè localStorage bằng DEFAULT_CHART_CONFIG trước khi cấu hình đã lưu kịp áp dụng (F-005)', async () => {
    const saved = makeConfig({
      maLines: [{ id: 'ma-saved', type: 'EMA', period: 21, color: '#123456', visible: true }],
      rsiLines: [],
    });
    localStorage.setItem('xgold:chart-config', encodeChartConfig(saved));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() => useIndicatorConfig());
    await waitFor(() => expect(result.current[0]).toEqual(saved));

    const defaultEncoded = encodeChartConfig(DEFAULT_CHART_CONFIG);
    const wroteDefault = setItemSpy.mock.calls.some(
      ([key, value]) => key === 'xgold:chart-config' && value === defaultEncoded,
    );
    expect(wroteDefault).toBe(false);

    setItemSpy.mockRestore();
  });

  it('setConfig cập nhật state + ghi lại localStorage và URL để chia sẻ được', async () => {
    const { result } = renderHook(() => useIndicatorConfig());
    await waitFor(() => expect(result.current[0]).toEqual(DEFAULT_CHART_CONFIG));

    const next = makeConfig({ maLines: [], rsiLines: [] });
    act(() => result.current[1](next));

    await waitFor(() => {
      const stored = localStorage.getItem('xgold:chart-config');
      expect(stored).toBe(encodeChartConfig(next));
    });
    expect(new URL(window.location.href).searchParams.get('cfg')).toBe(encodeChartConfig(next));
  });
});
