'use client';

import { INSTRUMENTS } from '@/lib/instruments';

interface CompareSwitcherProps {
  /** Mã chính đang xem (chuẩn CSDL, vd 'XAUUSD') — loại khỏi danh sách so sánh. */
  currentSymbol: string;
  /** Mã so sánh đang chọn (`null` = chưa chọn). Tối đa 1 mã phụ (tổng 2 mã trên chart). */
  value: string | null;
  /** Đổi mã so sánh; truyền `null` để bỏ chọn. */
  onChange: (symbol: string | null) => void;
}

/**
 * Chọn mã so sánh (W-507) — overlay mã thứ 2 lên pane giá bằng thang %. Chỉ cho chọn 1 mã phụ:
 * bấm mã đang chọn lần nữa để bỏ (toggle). Đọc danh sách từ registry `lib/instruments.ts`, loại mã
 * đang xem. Dùng nút (aria-pressed) như SymbolSwitcher/TimeframeSwitcher — bàn phím + đủ vùng chạm.
 */
export function CompareSwitcher({ currentSymbol, value, onChange }: CompareSwitcherProps) {
  const options = INSTRUMENTS.filter((instrument) => instrument.symbol !== currentSymbol);

  return (
    <div role="group" aria-label="So sánh mã" className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">So sánh</span>
      {options.map((instrument) => {
        const active = instrument.symbol === value;
        return (
          <button
            key={instrument.symbol}
            type="button"
            onClick={() => onChange(active ? null : instrument.symbol)}
            aria-pressed={active}
            aria-label={
              active ? `Bỏ so sánh ${instrument.label}` : `So sánh với ${instrument.label}`
            }
            className={
              active
                ? 'bg-primary text-primary-foreground flex min-h-11 items-center rounded-md px-3 text-sm font-medium'
                : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground flex min-h-11 items-center rounded-md border px-3 text-sm font-medium'
            }
          >
            {instrument.label}
          </button>
        );
      })}
    </div>
  );
}
