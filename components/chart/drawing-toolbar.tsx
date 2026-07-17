'use client';

import { useState } from 'react';
import type { DrawingTool } from './use-drawings';

/** Các công cụ vẽ + nhãn hiển thị (thứ tự trên thanh công cụ). */
const TOOLS: { tool: Exclude<DrawingTool, null>; label: string; hint: string }[] = [
  { tool: 'trendline', label: 'Xu hướng', hint: 'Vẽ đường xu hướng: click 2 điểm' },
  { tool: 'horizontal-line', label: 'Ngang', hint: 'Vẽ đường ngang: click 1 điểm' },
  { tool: 'fib-retracement', label: 'Fibonacci', hint: 'Vẽ Fibonacci: click 2 điểm' },
];

/** Class dùng chung cho một nút trong thanh — vùng chạm ≥ 44px (min-h-11/min-w-11). */
function buttonClass(active: boolean, tone: 'primary' | 'danger' = 'primary'): string {
  if (active) {
    return tone === 'primary'
      ? 'bg-primary text-primary-foreground min-h-11 shrink-0 rounded-md px-3 py-1.5 text-sm font-medium'
      : 'text-danger border-danger/50 hover:bg-danger/10 min-h-11 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium';
  }
  return 'text-muted-foreground hover:text-foreground border-border min-h-11 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium';
}

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  hasSelection: boolean;
  onToggleTool: (tool: Exclude<DrawingTool, null>) => void;
  /** Về chế độ chọn (thoát vẽ) — dùng để click vào nét đã vẽ. */
  onSelectMode: () => void;
  onDeleteSelected: () => void;
  /** Xoá toàn bộ nét vẽ của mã đang xem. */
  onClearAll: () => void;
}

/**
 * Thanh công cụ vẽ (W-511 dựng khung state; W-512 hoàn thiện bố cục + nút "Chọn"/"Xoá hết"):
 * - Desktop (≥ md): cột dọc, thu gọn được bằng nút ‹/› ở đầu thanh.
 * - Mobile (< md): thanh ngang, cuộn ngang nếu tràn thay vì xuống dòng — không che nội dung chart.
 *
 * "Chọn" ánh xạ vào `activeTool === null` — đúng chế độ chọn có sẵn của `useDrawings` (W-511): khi
 * không có công cụ vẽ nào bật, click vào một nét đã vẽ sẽ chọn nó (`onSelectDrawing` trong
 * `GoldChart`). Không cần thêm giá trị `'select'` vào `DrawingTool` — tránh đổi hành vi lõi đã merge.
 */
export function DrawingToolbar({
  activeTool,
  hasSelection,
  onToggleTool,
  onSelectMode,
  onDeleteSelected,
  onClearAll,
}: DrawingToolbarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      role="group"
      aria-label="Công cụ vẽ trên chart"
      className="border-border bg-surface/40 flex items-center gap-1 overflow-x-auto rounded-md border p-1 md:w-fit md:flex-col md:items-stretch md:overflow-visible"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Thu gọn thanh công cụ vẽ' : 'Mở rộng thanh công cụ vẽ'}
        title={expanded ? 'Thu gọn' : 'Mở rộng'}
        className="text-muted-foreground hover:text-foreground border-border min-h-11 min-w-11 shrink-0 rounded-md border px-2 text-sm font-medium"
      >
        <span aria-hidden="true">{expanded ? '‹' : '›'}</span>
      </button>

      {expanded && (
        <>
          <button
            type="button"
            onClick={onSelectMode}
            aria-pressed={activeTool === null}
            title="Chế độ chọn: click vào nét vẽ để chọn"
            className={buttonClass(activeTool === null)}
          >
            Chọn
          </button>

          {TOOLS.map(({ tool, label, hint }) => {
            const active = activeTool === tool;
            return (
              <button
                key={tool}
                type="button"
                onClick={() => onToggleTool(tool)}
                aria-pressed={active}
                title={hint}
                className={buttonClass(active)}
              >
                {label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            aria-disabled={!hasSelection}
            aria-label="Xoá nét vẽ đang chọn"
            title="Xoá nét vẽ đang chọn (hoặc phím Delete)"
            className={
              hasSelection
                ? buttonClass(true, 'danger')
                : 'text-muted-foreground border-border min-h-11 shrink-0 cursor-not-allowed rounded-md border px-3 py-1.5 text-sm font-medium opacity-50'
            }
          >
            Xoá
          </button>

          <button
            type="button"
            onClick={onClearAll}
            aria-label="Xoá hết nét vẽ"
            title="Xoá toàn bộ nét vẽ của mã này"
            className={buttonClass(true, 'danger')}
          >
            Xoá hết
          </button>
        </>
      )}
    </div>
  );
}
