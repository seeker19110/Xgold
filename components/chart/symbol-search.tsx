'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { filterInstruments } from '@/lib/instruments';

/**
 * Hộp tìm mã nhanh (W-508) — mở bằng `Ctrl+K`/`Cmd+K` từ bất kỳ đâu trên trang chart, hoặc nút 🔍
 * cạnh `SymbolSwitcher` (giữ nguyên, không thay thế — registry mới 4 mã, xem `symbol-switcher.tsx`).
 * Lọc registry qua `filterInstruments` (tách riêng, `lib/instruments.ts`) rồi điều hướng bằng
 * `router.push` (đóng modal trước khi chuyển trang, không dùng `<a>` thường).
 *
 * Focus trap cơ bản: mở → focus ô input ngay; đóng (Esc/click nền/chọn mã) → trả focus về nút 🔍
 * đã mở nó, đúng thực hành a11y cho dialog.
 */
export function SymbolSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  function openSearch() {
    setQuery('');
    setOpen(true);
  }

  // Phím tắt toàn trang — hoạt động bất kể focus đang ở đâu trên trang chart.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Mở: focus vào ô input. Đóng: trả focus về nút 🔍 đã mở modal. Chỉ đồng bộ DOM focus (hệ thống
  // ngoài React) theo `open` — không setState ở đây (tránh cascading render, đã tách `openSearch`).
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  function selectSlug(slug: string) {
    close();
    router.push(`/chart/${slug}`);
  }

  const results = filterInstruments(query);

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Gõ rồi Enter ngay (không cần Tab qua từng nút kết quả) → chọn kết quả đầu tiên đang hiện.
    const first = results[0];
    if (event.key === 'Enter' && first) {
      selectSlug(first.slug);
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openSearch}
        aria-label="Tìm mã (Ctrl+K)"
        title="Tìm mã (Ctrl+K)"
        className="border-border text-foreground hover:bg-surface flex min-h-11 min-w-11 items-center justify-center rounded-md border text-lg"
      >
        <span aria-hidden="true">🔍</span>
      </button>

      {open && (
        // Nền phủ toàn màn hình — click ra ngoài hộp thoại để đóng (yêu cầu nghiệm thu).
        <div
          className="bg-background/70 fixed inset-0 z-50 flex items-start justify-center p-4 pt-24"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
            className="bg-surface border-border w-full max-w-md rounded-lg border p-4 shadow-lg"
          >
            <h2 id={titleId} className="text-foreground mb-2 text-sm font-medium">
              Tìm mã
            </h2>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Nhập mã, tên… (vd XAU, vàng, DXY)"
              aria-label="Tìm mã"
              className="border-border text-foreground min-h-11 w-full rounded-md border px-3 text-sm"
            />
            <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto">
              {results.length === 0 && (
                <li className="text-muted-foreground px-2 py-1 text-sm">Không tìm thấy mã nào.</li>
              )}
              {results.map((instrument) => (
                <li key={instrument.slug}>
                  <button
                    type="button"
                    onClick={() => selectSlug(instrument.slug)}
                    className="hover:bg-accent hover:text-accent-foreground flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm"
                  >
                    <span className="font-medium">{instrument.label}</span>
                    <span className="text-muted-foreground text-xs">{instrument.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
