import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartPageClient } from '@/app/chart/[symbol]/chart-page-client';
import type { CandlesState } from '@/components/chart/use-candles';
import { DEFAULT_CHART_CONFIG } from '@/lib/indicators/config';
import type { Candle } from '@/lib/candles/types';

const { useCandlesMock, useIndicatorConfigMock, setConfigMock } = vi.hoisted(() => ({
  useCandlesMock: vi.fn(),
  useIndicatorConfigMock: vi.fn(),
  setConfigMock: vi.fn(),
}));

vi.mock('@/components/chart/use-candles', () => ({ useCandles: useCandlesMock }));
vi.mock('@/components/chart/use-indicator-config', () => ({
  useIndicatorConfig: useIndicatorConfigMock,
}));

// Component con nặng (canvas/lightweight-charts, fetch riêng) — không phải phạm vi test này
// (đã có test riêng: gold-chart không test được jsdom/canvas, confluence-panel/indicator-panel có
// test riêng). Thay bằng stand-in nhẹ để cô lập logic thật của chart-page-client.tsx (4 trạng thái
// + nút Xuất CSV).
vi.mock('@/components/chart/gold-chart', () => ({
  GoldChart: ({ label }: { label: string }) => <div data-testid="gold-chart">{label}</div>,
}));
vi.mock('@/components/chart/analysis-panel', () => ({
  AnalysisPanel: () => <div data-testid="analysis-panel" />,
}));
vi.mock('@/components/chart/confluence-panel', () => ({
  ConfluencePanel: () => <div data-testid="confluence-panel" />,
}));
vi.mock('@/components/chart/indicator-panel', () => ({
  IndicatorPanel: () => <div data-testid="indicator-panel" />,
}));

const CANDLES: Candle[] = [
  { ts: '2026-07-16T08:00:00.000Z', open: 3350, high: 3360, low: 3345, close: 3355, volume: 100 },
];

function mockCandles(state: CandlesState) {
  useCandlesMock.mockReturnValue(state);
}

function renderPage() {
  useIndicatorConfigMock.mockReturnValue([DEFAULT_CHART_CONFIG, setConfigMock]);
  return render(
    <ChartPageClient symbol="XAUUSD" slug="xauusd" label="XAU/USD" chartLabel="giá vàng XAU/USD" />,
  );
}

describe('ChartPageClient', () => {
  it('trạng thái loading: hiện thông báo đang tải, không hiện chart', () => {
    mockCandles({ status: 'loading', candles: [], source: null, error: null });
    renderPage();

    expect(screen.getByText('Đang tải dữ liệu…')).toBeInTheDocument();
    expect(screen.queryByTestId('gold-chart')).not.toBeInTheDocument();
  });

  it('trạng thái error: hiện thông báo lỗi', () => {
    mockCandles({ status: 'error', candles: [], source: null, error: 'không kết nối được' });
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Không tải được dữ liệu: không kết nối được',
    );
  });

  it('trạng thái success rỗng: hiện thông báo chưa có dữ liệu cho khung này', () => {
    mockCandles({ status: 'success', candles: [], source: 'supabase', error: null });
    renderPage();

    expect(screen.getByText('Chưa có dữ liệu cho khung thời gian này.')).toBeInTheDocument();
  });

  it('source sample: hiện banner dữ liệu mẫu', () => {
    mockCandles({ status: 'loading', candles: [], source: 'sample', error: null });
    renderPage();

    expect(screen.getByText(/dữ liệu mẫu/)).toBeInTheDocument();
  });

  it('trạng thái success có dữ liệu: hiện chart + panel + nút Xuất CSV', () => {
    mockCandles({ status: 'success', candles: CANDLES, source: 'supabase', error: null });
    renderPage();

    expect(screen.getByTestId('gold-chart')).toHaveTextContent('giá vàng XAU/USD');
    expect(screen.getByTestId('analysis-panel')).toBeInTheDocument();
    expect(screen.getByTestId('confluence-panel')).toBeInTheDocument();
    expect(screen.getByTestId('indicator-panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xuất CSV' })).toBeInTheDocument();
  });

  it('bấm nút Xuất CSV: tạo + click + dọn <a download> đúng tên file (F-011)', () => {
    mockCandles({ status: 'success', candles: CANDLES, source: 'supabase', error: null });
    renderPage();

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalled();
    const anchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('xauusd-1h-candles.csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
