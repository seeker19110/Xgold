import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrawingToolbar } from '@/components/chart/drawing-toolbar';

/**
 * W-512 — thanh công cụ vẽ: chọn công cụ đúng gọi đúng callback + `aria-pressed` phản ánh đúng
 * `activeTool`, nút "Chọn" ánh xạ về chế độ chọn (`activeTool === null`, xem lý do reconcile trong
 * drawing-toolbar.tsx), nút "Xoá hết" gọi `onClearAll`, thu gọn/mở rộng ẩn/hiện đúng các nút.
 * Bố cục responsive thật (cột dọc desktop / thanh ngang mobile) đối chiếu bằng E2E
 * (`e2e/drawing-tools.spec.ts`) vì phụ thuộc kích thước viewport thật.
 */
function renderToolbar(overrides: Partial<Parameters<typeof DrawingToolbar>[0]> = {}) {
  const onToggleTool = vi.fn();
  const onSelectMode = vi.fn();
  const onDeleteSelected = vi.fn();
  const onClearAll = vi.fn();
  render(
    <DrawingToolbar
      activeTool={null}
      hasSelection={false}
      onToggleTool={onToggleTool}
      onSelectMode={onSelectMode}
      onDeleteSelected={onDeleteSelected}
      onClearAll={onClearAll}
      {...overrides}
    />,
  );
  return { onToggleTool, onSelectMode, onDeleteSelected, onClearAll };
}

describe('DrawingToolbar', () => {
  it('mặc định activeTool=null → nút "Chọn" đang bật (aria-pressed=true)', () => {
    renderToolbar({ activeTool: null });
    expect(screen.getByRole('button', { name: 'Chọn' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('activeTool="trendline" → đúng nút Xu hướng bật, các nút khác tắt', () => {
    renderToolbar({ activeTool: 'trendline' });
    expect(screen.getByRole('button', { name: 'Xu hướng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Ngang' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Fibonacci' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Chọn' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('click từng công cụ gọi onToggleTool đúng loại (không lẫn loại khác)', () => {
    const { onToggleTool } = renderToolbar();

    fireEvent.click(screen.getByRole('button', { name: 'Xu hướng' }));
    expect(onToggleTool).toHaveBeenLastCalledWith('trendline');

    fireEvent.click(screen.getByRole('button', { name: 'Ngang' }));
    expect(onToggleTool).toHaveBeenLastCalledWith('horizontal-line');

    fireEvent.click(screen.getByRole('button', { name: 'Fibonacci' }));
    expect(onToggleTool).toHaveBeenLastCalledWith('fib-retracement');

    expect(onToggleTool).toHaveBeenCalledTimes(3);
  });

  it('click "Chọn" gọi onSelectMode (về chế độ chọn, không phải một loại vẽ)', () => {
    const { onSelectMode, onToggleTool } = renderToolbar({ activeTool: 'trendline' });

    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }));

    expect(onSelectMode).toHaveBeenCalledOnce();
    expect(onToggleTool).not.toHaveBeenCalled();
  });

  it('nút "Xoá" vô hiệu hoá khi hasSelection=false, bật khi có chọn và gọi onDeleteSelected', () => {
    const { rerender } = render(
      <DrawingToolbar
        activeTool={null}
        hasSelection={false}
        onToggleTool={vi.fn()}
        onSelectMode={vi.fn()}
        onDeleteSelected={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Xoá nét vẽ đang chọn' })).toBeDisabled();

    const onDeleteSelected = vi.fn();
    rerender(
      <DrawingToolbar
        activeTool={null}
        hasSelection={true}
        onToggleTool={vi.fn()}
        onSelectMode={vi.fn()}
        onDeleteSelected={onDeleteSelected}
        onClearAll={vi.fn()}
      />,
    );
    const deleteButton = screen.getByRole('button', { name: 'Xoá nét vẽ đang chọn' });
    expect(deleteButton).not.toBeDisabled();
    fireEvent.click(deleteButton);
    expect(onDeleteSelected).toHaveBeenCalledOnce();
  });

  it('click "Xoá hết" gọi onClearAll (luôn bật, không phụ thuộc hasSelection)', () => {
    const { onClearAll } = renderToolbar({ hasSelection: false });
    fireEvent.click(screen.getByRole('button', { name: 'Xoá hết nét vẽ' }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it('thu gọn (‹) ẩn các nút công cụ, chỉ còn nút mở rộng (›); bấm lại hiện lại đủ nút', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh công cụ vẽ' }));

    expect(screen.queryByRole('button', { name: 'Chọn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xu hướng' })).not.toBeInTheDocument();
    const expandButton = screen.getByRole('button', { name: 'Mở rộng thanh công cụ vẽ' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(expandButton);

    expect(screen.getByRole('button', { name: 'Chọn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xu hướng' })).toBeInTheDocument();
  });
});
