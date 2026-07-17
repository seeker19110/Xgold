'use client';

import type { DrawingTool } from './use-drawings';

/** Các công cụ vẽ + nhãn hiển thị (thứ tự trên thanh công cụ). */
const TOOLS: { tool: Exclude<DrawingTool, null>; label: string; hint: string }[] = [
  { tool: 'trendline', label: 'Đường xu hướng', hint: 'Vẽ đoạn thẳng: click 2 điểm' },
  { tool: 'horizontal-line', label: 'Đường ngang', hint: 'Vẽ đường ngang: click 1 điểm' },
  { tool: 'fib-retracement', label: 'Fibonacci', hint: 'Vẽ Fibonacci: click 2 điểm' },
];

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  hasSelection: boolean;
  onToggleTool: (tool: Exclude<DrawingTool, null>) => void;
  onDeleteSelected: () => void;
}

/**
 * Thanh công cụ vẽ (W-511): chọn công cụ (đường xu hướng / đường ngang / Fibonacci), xoá nét đang
 * chọn. Vùng chạm ≥ 44px (`min-h-11`), `aria-pressed` cho công cụ đang bật; nút xoá vô hiệu hoá khi
 * chưa chọn nét nào (kèm `aria-disabled` để trợ năng đọc đúng trạng thái).
 */
export function DrawingToolbar({
  activeTool,
  hasSelection,
  onToggleTool,
  onDeleteSelected,
}: DrawingToolbarProps) {
  return (
    <div
      role="group"
      aria-label="Công cụ vẽ trên chart"
      className="flex flex-wrap items-center gap-1"
    >
      {TOOLS.map(({ tool, label, hint }) => {
        const active = activeTool === tool;
        return (
          <button
            key={tool}
            type="button"
            onClick={() => onToggleTool(tool)}
            aria-pressed={active}
            title={hint}
            className={
              active
                ? 'bg-primary text-primary-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
                : 'text-muted-foreground hover:text-foreground border-border min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium'
            }
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
            ? 'text-danger border-danger/50 hover:bg-danger/10 min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium'
            : 'text-muted-foreground border-border min-h-11 cursor-not-allowed rounded-md border px-3 py-1.5 text-sm font-medium opacity-50'
        }
      >
        Xoá
      </button>
    </div>
  );
}
