import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawings } from '@/components/chart/use-drawings';
import { loadDrawings, saveDrawings } from '@/lib/drawings/storage';
import type { Drawing } from '@/lib/drawings/types';

const SYMBOL = 'XAUUSD';

const SAMPLE: Drawing = { id: 'a', type: 'horizontal-line', price: 1950.5, color: '#ff0000' };

beforeEach(() => {
  localStorage.clear();
});

/**
 * W-512 — bổ sung `clearAll` (nút "Xoá hết" trên thanh công cụ vẽ). Các hành vi khác của
 * `useDrawings` (toggleTool/commitDrawing/deleteSelected/phím Delete) đã dựng ở W-511 và được kiểm
 * gián tiếp qua `e2e/chart.spec.ts` + hành vi runtime; bộ này tập trung vào phần mới.
 */
describe('useDrawings — clearAll', () => {
  it('xoá toàn bộ nét vẽ, bỏ chọn, về chế độ chọn (activeTool=null), và ghi localStorage rỗng', () => {
    saveDrawings(SYMBOL, [SAMPLE]);
    const { result } = renderHook(() => useDrawings(SYMBOL));

    expect(result.current.drawings).toEqual([SAMPLE]);

    act(() => result.current.selectDrawing('a'));
    expect(result.current.selectedId).toBe('a');

    act(() => result.current.clearAll());

    expect(result.current.drawings).toEqual([]);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.activeTool).toBeNull();
    expect(loadDrawings(SYMBOL)).toEqual([]);
  });

  it('gọi khi đang bật một công cụ vẽ cũng đưa activeTool về null (thoát chế độ vẽ)', () => {
    const { result } = renderHook(() => useDrawings(SYMBOL));

    act(() => result.current.toggleTool('trendline'));
    expect(result.current.activeTool).toBe('trendline');

    act(() => result.current.clearAll());

    expect(result.current.activeTool).toBeNull();
  });

  it('không làm gì sai khi danh sách đã rỗng (idempotent)', () => {
    const { result } = renderHook(() => useDrawings(SYMBOL));

    act(() => result.current.clearAll());

    expect(result.current.drawings).toEqual([]);
    expect(loadDrawings(SYMBOL)).toEqual([]);
  });
});
