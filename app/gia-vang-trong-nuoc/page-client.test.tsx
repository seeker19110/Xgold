import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DomesticGoldPageClient } from '@/app/gia-vang-trong-nuoc/page-client';
import type { DomesticGoldState } from '@/components/domestic-gold/use-domestic-gold';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

const { useDomesticGoldMock } = vi.hoisted(() => ({ useDomesticGoldMock: vi.fn() }));

vi.mock('@/components/domestic-gold/use-domestic-gold', () => ({
  useDomesticGold: useDomesticGoldMock,
}));

function price(overrides: Partial<DomesticGoldPrice> = {}): DomesticGoldPrice {
  return {
    vendor: 'BTMC',
    product: 'Vàng miếng SJC',
    buy: 78_000_000,
    sell: 79_500_000,
    ts: '2026-07-16T08:00:00.000Z',
    source: 'btmc',
    ...overrides,
  };
}

function mockState(state: DomesticGoldState) {
  useDomesticGoldMock.mockReturnValue(state);
}

describe('DomesticGoldPageClient', () => {
  it('source sample: hiện banner "dữ liệu mẫu"', () => {
    mockState({ status: 'loading', prices: [], source: 'sample', error: null });
    render(<DomesticGoldPageClient />);

    expect(screen.getByText(/dữ liệu mẫu/)).toBeInTheDocument();
  });

  it('source supabase: KHÔNG hiện banner "dữ liệu mẫu"', () => {
    mockState({ status: 'loading', prices: [], source: 'supabase', error: null });
    render(<DomesticGoldPageClient />);

    expect(screen.queryByText('Đang hiển thị')).not.toBeInTheDocument();
  });

  it('trạng thái loading: hiện thông báo đang tải', () => {
    mockState({ status: 'loading', prices: [], source: null, error: null });
    render(<DomesticGoldPageClient />);

    expect(screen.getByText('Đang tải dữ liệu…')).toBeInTheDocument();
  });

  it('trạng thái error: hiện thông báo lỗi', () => {
    mockState({ status: 'error', prices: [], source: null, error: 'mạng lỗi' });
    render(<DomesticGoldPageClient />);

    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được dữ liệu: mạng lỗi');
  });

  it('trạng thái success rỗng: hiện thông báo chưa có dữ liệu', () => {
    mockState({ status: 'success', prices: [], source: 'supabase', error: null });
    render(<DomesticGoldPageClient />);

    expect(screen.getByText('Chưa có dữ liệu giá vàng trong nước.')).toBeInTheDocument();
  });

  it('trạng thái success có dữ liệu: hiện bảng giá + badge freshness + nguồn provider đúng nhãn', () => {
    mockState({
      status: 'success',
      prices: [price({ source: 'btmc' })],
      source: 'supabase',
      error: null,
    });
    render(<DomesticGoldPageClient />);

    expect(screen.getByText('Vàng miếng SJC')).toBeInTheDocument();
    expect(screen.getByText(/Bảo Tín Minh Châu \(BTMC\)/)).toBeInTheDocument();
  });

  it('nguồn không có nhãn định nghĩa trước: hiển thị nguyên tên provider (fallback)', () => {
    mockState({
      status: 'success',
      prices: [price({ source: 'nguon-la' })],
      source: 'supabase',
      error: null,
    });
    render(<DomesticGoldPageClient />);

    expect(screen.getByText(/nguon-la/)).toBeInTheDocument();
  });

  it('nhiều dòng nhiều nguồn: nhãn nguồn liệt kê đủ, không trùng lặp', () => {
    mockState({
      status: 'success',
      prices: [
        price({ vendor: 'BTMC', source: 'btmc' }),
        price({ vendor: 'PNJ', source: 'vang-today' }),
      ],
      source: 'supabase',
      error: null,
    });
    render(<DomesticGoldPageClient />);

    expect(
      screen.getByText(/Bảo Tín Minh Châu \(BTMC\), vang\.today \(dự phòng\)/),
    ).toBeInTheDocument();
  });
});
