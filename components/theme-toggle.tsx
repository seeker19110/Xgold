'use client';

import { useEffect, useState } from 'react';

/**
 * Nút chuyển theme (Dark blue mặc định ↔ Light).
 * Đi kèm `styles/theme.css` (design tokens) + script no-flash trong app/layout.tsx.
 * Xem docs/framework/BO-SUNG-giao-dien-theme.md.
 *
 * Nguyên tắc: dùng token (bg-background/text-foreground...), không hard-code màu;
 * lựa chọn được nhớ trong localStorage; có aria-label cho accessibility.
 */
type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark'); // mặc định Dark blue

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
      className="border-border text-foreground rounded-lg border px-3 py-2"
    >
      {theme === 'dark' ? '☀️ Sáng' : '🌙 Tối'}
    </button>
  );
}
