import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WatchlistPanel } from '@/components/watchlist/watchlist-panel';
import type { WatchlistRow, WatchlistRowsState } from '@/components/watchlist/use-watchlist-rows';

function row(overrides: Partial<WatchlistRow> = {}): WatchlistRow {
  return {
    symbol: 'XAUUSD',
    slug: 'xauusd',
    label: 'XAU/USD',
    currency: 'USD',
    latestClose: 2500,
    direction: 'buy',
    norm: 0.5,
    rsi14: 55,
    trend: 'up',
    source: 'sample',
    changePercent: 1.23,
    ...overrides,
  };
}

describe('WatchlistPanel', () => {
  it('idle → gợi ý cách ghim', () => {
    const state: WatchlistRowsState = { status: 'idle', rows: [], error: null };
    render(<WatchlistPanel state={state} onUnpin={vi.fn()} />);
    expect(screen.getByText(/Chưa ghim mã nào/)).toBeInTheDocument();
  });

  it('loading → trạng thái tải', () => {
    const state: WatchlistRowsState = { status: 'loading', rows: [], error: null };
    render(<WatchlistPanel state={state} onUnpin={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải/);
  });

  it('error → thông báo lỗi', () => {
    const state: WatchlistRowsState = { status: 'error', rows: [], error: 'sập mạng' };
    render(<WatchlistPanel state={state} onUnpin={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/sập mạng/);
  });

  it('success → hiển thị mã, giá, tín hiệu, ±%, link đúng slug', () => {
    const state: WatchlistRowsState = {
      status: 'success',
      rows: [row()],
      error: null,
    };
    render(<WatchlistPanel state={state} onUnpin={vi.fn()} />);
    expect(screen.getByText('XAU/USD')).toBeInTheDocument();
    expect(screen.getByText('$2,500')).toBeInTheDocument();
    expect(screen.getByText('Mua')).toBeInTheDocument();
    expect(screen.getByText('+1.23%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /XAU\/USD/ })).toHaveAttribute('href', '/chart/xauusd');
  });

  it('giá/tín hiệu/±% null → hiển thị "—", không lỗi', () => {
    const state: WatchlistRowsState = {
      status: 'success',
      rows: [row({ latestClose: null, direction: null, changePercent: null })],
      error: null,
    };
    render(<WatchlistPanel state={state} onUnpin={vi.fn()} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('bấm nút bỏ ghim gọi onUnpin đúng symbol', () => {
    const onUnpin = vi.fn();
    const state: WatchlistRowsState = {
      status: 'success',
      rows: [row()],
      error: null,
    };
    render(<WatchlistPanel state={state} onUnpin={onUnpin} />);

    fireEvent.click(screen.getByRole('button', { name: /Bỏ ghim XAU\/USD/ }));
    expect(onUnpin).toHaveBeenCalledWith('XAUUSD');
  });
});
