'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Drawing } from '@/lib/drawings/types';
import { loadDrawings, saveDrawings } from '@/lib/drawings/storage';

/** Loại công cụ vẽ đang bật; `null` = chế độ chọn (click vào nét đã vẽ để chọn). */
export type DrawingTool = Drawing['type'] | null;

export interface UseDrawingsResult {
  drawings: Drawing[];
  selectedId: string | null;
  activeTool: DrawingTool;
  /** Bật/tắt một công cụ vẽ; bật lại chính công cụ đang bật = tắt (về chế độ chọn). */
  toggleTool: (tool: Exclude<DrawingTool, null>) => void;
  /** Thoát chế độ vẽ về chế độ chọn. */
  cancelTool: () => void;
  /** Thêm một nét vẽ mới (đã dựng xong toạ độ) — lưu localStorage + chọn nét vừa thêm. */
  commitDrawing: (drawing: Drawing) => void;
  /** Chọn/bỏ chọn một nét theo id (`null` = bỏ chọn). */
  selectDrawing: (id: string | null) => void;
  /** Xoá nét đang chọn (không làm gì nếu chưa chọn). */
  deleteSelected: () => void;
  /** Xoá TOÀN BỘ nét vẽ của symbol hiện tại (W-512 — nút "Xoá hết"). */
  clearAll: () => void;
}

/**
 * Quản lý trạng thái công cụ vẽ cho MỘT symbol: danh sách nét vẽ (lưu/đọc localStorage qua W-510),
 * nét đang chọn, công cụ đang bật. Persistence thực hiện NGAY trong các hành động (thêm/xoá) thay vì
 * qua effect phụ thuộc `drawings` — tránh đua ghi-đè khi đổi symbol (effect nạp lại chạy sau, dễ ghi
 * nhầm nét của symbol cũ sang key symbol mới).
 */
export function useDrawings(symbol: string): UseDrawingsResult {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>(null);

  // Nạp lại khi đổi symbol (chỉ chạy phía client). Reset chọn/công cụ để không mang trạng thái
  // của symbol trước sang symbol mới.
  useEffect(() => {
    // Nạp lại nét đã lưu khi đổi symbol — đồng bộ state React với localStorage (nguồn ngoài), theo
    // đúng mẫu load-on-mount của `use-indicator-config.ts`/`use-watchlist.ts`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawings(loadDrawings(symbol));
    setSelectedId(null);
    setActiveTool(null);
  }, [symbol]);

  const toggleTool = useCallback((tool: Exclude<DrawingTool, null>) => {
    setSelectedId(null);
    setActiveTool((current) => (current === tool ? null : tool));
  }, []);

  const cancelTool = useCallback(() => setActiveTool(null), []);

  const commitDrawing = useCallback(
    (drawing: Drawing) => {
      setDrawings((prev) => {
        const next = [...prev, drawing];
        saveDrawings(symbol, next);
        return next;
      });
      setSelectedId(drawing.id);
      setActiveTool(null);
    },
    [symbol],
  );

  const selectDrawing = useCallback((id: string | null) => setSelectedId(id), []);

  const deleteSelected = useCallback(() => {
    setSelectedId((currentSelected) => {
      if (currentSelected === null) return null;
      setDrawings((prev) => {
        const next = prev.filter((d) => d.id !== currentSelected);
        saveDrawings(symbol, next);
        return next;
      });
      return null;
    });
  }, [symbol]);

  const clearAll = useCallback(() => {
    setDrawings([]);
    saveDrawings(symbol, []);
    setSelectedId(null);
    setActiveTool(null);
  }, [symbol]);

  // Phím Delete/Backspace xoá nét đang chọn — bỏ qua khi con trỏ đang ở ô nhập liệu.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (selectedId === null) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      deleteSelected();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, deleteSelected]);

  return {
    drawings,
    selectedId,
    activeTool,
    toggleTool,
    cancelTool,
    commitDrawing,
    selectDrawing,
    deleteSelected,
    clearAll,
  };
}
