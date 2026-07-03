import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('mặc định hiển thị nút chuyển sang nền sáng (Dark blue mặc định)', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Chuyển sang nền sáng' })).toBeInTheDocument();
  });

  it('bấm nút chuyển sang Light: đổi nhãn, gắn data-theme và lưu localStorage', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang nền sáng' }));

    expect(screen.getByRole('button', { name: 'Chuyển sang nền tối' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('khôi phục theme đã lưu từ lần trước (localStorage) sau khi mount', async () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeToggle />);

    expect(await screen.findByRole('button', { name: 'Chuyển sang nền tối' })).toBeInTheDocument();
  });
});
