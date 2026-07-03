'use client';

import { TIMEFRAMES, type Timeframe } from '@/lib/candles/types';

interface TimeframeSwitcherProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

export function TimeframeSwitcher({ value, onChange }: TimeframeSwitcherProps) {
  return (
    <div role="group" aria-label="Chọn khung thời gian" className="flex gap-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => onChange(tf)}
          aria-pressed={tf === value}
          className={
            tf === value
              ? 'bg-primary text-primary-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
              : 'text-muted-foreground hover:text-foreground min-h-11 rounded-md px-3 py-1.5 text-sm font-medium'
          }
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
