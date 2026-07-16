import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisPanel } from '@/components/chart/analysis-panel';
import { DEFAULT_ANALYSIS_CONFIG } from '@/lib/analysis/config';
import { generateWalk } from '@/lib/fixtures/generate';
import type { AnalysisConfig } from '@/lib/analysis';

const HOUR_MS = 3_600_000;
const START_TS = Date.parse('2024-01-01T00:00:00.000Z');

// seed=1, 120 nến 1h giá 2000 → tín hiệu Bán đủ dữ liệu (mây/ATR/RSI đầy đủ) → trade levels đầy đủ
// (xác nhận bằng script dò seed thủ công, xem docs/ops/COMPLETION-PLAN.md W-402).
const CANDLES_FULL_SIGNAL = generateWalk(START_TS, HOUR_MS, 120, 2000, 1);

// seed=5, 40 nến (chưa đủ 52 nến cho Ichimoku Span B + dịch chuyển) → tín hiệu Bán nhưng
// computeTradeLevels trả EMPTY_LEVELS (F-018 — nhất quán, không hiển thị "nửa vời").
const CANDLES_INSUFFICIENT_DATA = generateWalk(START_TS, HOUR_MS, 40, 2000, 5);

const TIMEFRAME = '1h' as const;

function renderPanel(config: AnalysisConfig, candles = CANDLES_FULL_SIGNAL) {
  const onChange = vi.fn();
  const view = render(
    <AnalysisPanel candles={candles} timeframe={TIMEFRAME} config={config} onChange={onChange} />,
  );
  return { onChange, unmount: view.unmount };
}

describe('AnalysisPanel', () => {
  it('tắt phân tích: chỉ hiện tiêu đề + checkbox, không có khối gợi ý/quy tắc/trade levels', () => {
    renderPanel({ ...DEFAULT_ANALYSIS_CONFIG, enabled: false });

    expect(screen.getByRole('checkbox', { name: 'Bật/tắt phân tích kết hợp' })).not.toBeChecked();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Mức tham chiếu giao dịch (ADR-0011)')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bật\/tắt quy tắc/ })).not.toBeInTheDocument();
  });

  it('bật phân tích nhưng tắt hết quy tắc: hiện thông báo "chưa có quy tắc nào được bật"', () => {
    const allDisabled: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      rules: Object.fromEntries(
        Object.entries(DEFAULT_ANALYSIS_CONFIG.rules).map(([id, r]) => [
          id,
          { ...r, enabled: false },
        ]),
      ) as AnalysisConfig['rules'],
    };
    renderPanel(allDisabled);

    expect(
      screen.getByText(
        'Chưa có quy tắc nào được bật — bật ít nhất một quy tắc bên dưới để có tín hiệu.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Mức tham chiếu giao dịch (ADR-0011)')).not.toBeInTheDocument();
  });

  it('đủ tín hiệu + đủ dữ liệu: hiện khối gợi ý và khối Entry/SL/TP/Xác suất/Rủi ro', () => {
    renderPanel(DEFAULT_ANALYSIS_CONFIG, CANDLES_FULL_SIGNAL);

    expect(screen.getByRole('status')).toBeInTheDocument();
    const tradeBlock = screen.getByText('Mức tham chiếu giao dịch (ADR-0011)').closest('div');
    expect(tradeBlock).not.toBeNull();
    expect(tradeBlock!.textContent).toContain('Xác suất');
    expect(tradeBlock!.textContent).not.toContain('- / -');
  });

  it('có tín hiệu nhưng thiếu dữ liệu cho mây/ATR (F-018): KHÔNG hiện khối trade levels nửa vời', () => {
    renderPanel(DEFAULT_ANALYSIS_CONFIG, CANDLES_INSUFFICIENT_DATA);

    // Vẫn có khối gợi ý (đủ dữ liệu cho các rule khác)...
    expect(screen.getByRole('status')).toBeInTheDocument();
    // ...nhưng KHÔNG hiện khối "Mức tham chiếu giao dịch" vì trade levels toàn null (F-018 đã sửa).
    expect(screen.queryByText('Mức tham chiếu giao dịch (ADR-0011)')).not.toBeInTheDocument();
  });

  it('không có nến: không crash, không hiện khối gợi ý/trade levels, vẫn hiện disclaimer', () => {
    renderPanel(DEFAULT_ANALYSIS_CONFIG, []);

    expect(screen.queryByRole('status', { name: undefined })).not.toBeInTheDocument();
    expect(screen.queryByText('Mức tham chiếu giao dịch (ADR-0011)')).not.toBeInTheDocument();
  });

  it('bấm checkbox bật/tắt một quy tắc: gọi onChange với rules cập nhật đúng', () => {
    const { onChange } = renderPanel(DEFAULT_ANALYSIS_CONFIG);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Bật/tắt quy tắc Giao cắt MA (SMA 50/200)' }),
    );

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_ANALYSIS_CONFIG,
      rules: {
        ...DEFAULT_ANALYSIS_CONFIG.rules,
        'ma-cross': { ...DEFAULT_ANALYSIS_CONFIG.rules['ma-cross'], enabled: false },
      },
    });
  });

  it('đổi trọng số quy tắc trong khoảng [0,1]: gọi onChange với weight mới', () => {
    const { onChange } = renderPanel(DEFAULT_ANALYSIS_CONFIG);

    const weightInput = screen.getByLabelText('Trọng số quy tắc Giao cắt MA (SMA 50/200)');
    fireEvent.change(weightInput, { target: { value: '0.5' } });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_ANALYSIS_CONFIG,
      rules: {
        ...DEFAULT_ANALYSIS_CONFIG.rules,
        'ma-cross': { ...DEFAULT_ANALYSIS_CONFIG.rules['ma-cross'], weight: 0.5 },
      },
    });
  });

  it('đổi trọng số ngoài khoảng [0,1]: KHÔNG gọi onChange (bỏ qua giá trị không hợp lệ)', () => {
    const { onChange } = renderPanel(DEFAULT_ANALYSIS_CONFIG);

    const weightInput = screen.getByLabelText('Trọng số quy tắc Giao cắt MA (SMA 50/200)');
    fireEvent.change(weightInput, { target: { value: '1.5' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('luôn hiện disclaimer bất kể bật/tắt phân tích', () => {
    const disclaimer = /không phải lời khuyên đầu tư/;
    const { unmount } = renderPanel({ ...DEFAULT_ANALYSIS_CONFIG, enabled: false });
    expect(screen.getByText(disclaimer)).toBeInTheDocument();
    unmount();

    renderPanel(DEFAULT_ANALYSIS_CONFIG);
    expect(screen.getByText(disclaimer)).toBeInTheDocument();
  });
});
