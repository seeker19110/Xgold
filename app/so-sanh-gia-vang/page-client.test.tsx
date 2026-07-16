import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoldComparePageClient } from '@/app/so-sanh-gia-vang/page-client';
import type { GoldCompareState } from '@/components/gold-compare/use-gold-compare';
import type { GoldPriceComparisonRow } from '@/lib/gold-compare/convert';

const { useGoldCompareMock } = vi.hoisted(() => ({ useGoldCompareMock: vi.fn() }));

vi.mock('@/components/gold-compare/use-gold-compare', () => ({
  useGoldCompare: useGoldCompareMock,
}));

const SAMPLE_ROW: GoldPriceComparisonRow = {
  vendor: 'SJC',
  product: 'Vàng miếng SJC',
  domesticBuyVnd: 78_000_000,
  domesticSellVnd: 79_500_000,
  worldPerLuongVnd: 75_000_000,
  diffBuyVnd: 3_000_000,
  diffBuyPercent: 4,
  diffSellVnd: 4_500_000,
  diffSellPercent: 6,
};

function mockState(state: GoldCompareState) {
  useGoldCompareMock.mockReturnValue(state);
}

describe('GoldComparePageClient', () => {
  it('trạng thái loading: hiện thông báo đang tải, không hiện bảng', () => {
    mockState({ status: 'loading', rows: [], worldAsOfTs: null, error: null });
    render(<GoldComparePageClient />);

    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Đang tải dữ liệu…');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('trạng thái error: hiện thông báo lỗi kèm nội dung lỗi', () => {
    mockState({ status: 'error', rows: [], worldAsOfTs: null, error: 'mất kết nối' });
    render(<GoldComparePageClient />);

    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được dữ liệu: mất kết nối');
  });

  it('trạng thái success nhưng rỗng: hiện thông báo chưa đủ dữ liệu', () => {
    mockState({ status: 'success', rows: [], worldAsOfTs: null, error: null });
    render(<GoldComparePageClient />);

    expect(
      screen.getByText(
        'Chưa đủ dữ liệu để so sánh (thiếu giá trong nước hoặc giá thế giới/tỷ giá).',
      ),
    ).toBeInTheDocument();
  });

  it('trạng thái success có dữ liệu: hiện bảng so sánh + mốc thời gian giá thế giới', () => {
    mockState({
      status: 'success',
      rows: [SAMPLE_ROW],
      worldAsOfTs: '2026-07-16T08:00:00.000Z',
      error: null,
    });
    render(<GoldComparePageClient />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Vàng miếng SJC')).toBeInTheDocument();
    expect(screen.getByText(/tính đến:/)).toBeInTheDocument();
  });

  it('worldAsOfTs null: hiện "không rõ thời điểm" thay vì crash format ngày', () => {
    mockState({ status: 'success', rows: [SAMPLE_ROW], worldAsOfTs: null, error: null });
    render(<GoldComparePageClient />);

    expect(screen.getByText(/không rõ thời điểm/)).toBeInTheDocument();
  });
});
