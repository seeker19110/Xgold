'use client';

import { CHART_TYPES, type ChartType } from '@/lib/indicators/config';

/** Nhãn hiển thị cho từng kiểu chart (khớp danh sách nguồn `CHART_TYPES` trong config). */
const CHART_TYPE_LABELS: Record<ChartType, string> = {
  candles: 'Nến',
  heikinAshi: 'Heikin Ashi',
  bar: 'Bar',
  line: 'Line',
  area: 'Area',
};

interface ChartTypeSwitcherProps {
  value: ChartType;
  onChange: (chartType: ChartType) => void;
}

/**
 * Nhóm nút chọn kiểu chart (Nến / Heikin Ashi / Bar / Line / Area) — cùng phong cách
 * `TimeframeSwitcher`. Vùng chạm ≥ 44px (min-h-11), `aria-pressed` cho nút đang chọn.
 */
export function ChartTypeSwitcher({ value, onChange }: ChartTypeSwitcherProps) {
  return (
    <div role="group" aria-label="Chọn kiểu chart" className="flex flex-wrap gap-1">
      {CHART_TYPES.map((chartType) => (
        <button
          key={chartType}
          type="button"
          onClick={() => onChange(chartType)}
          aria-pressed={chartType === value}
          className={
            chartType === value
              ? 'bg-primary text-primary-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
              : 'text-muted-foreground hover:text-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
          }
        >
          {CHART_TYPE_LABELS[chartType]}
        </button>
      ))}
    </div>
  );
}
