import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompareTable } from '@/components/gold-compare/compare-table';
import type { GoldPriceComparisonRow } from '@/lib/gold-compare/convert';

function row(overrides: Partial<GoldPriceComparisonRow> = {}): GoldPriceComparisonRow {
  return {
    vendor: 'SJC',
    product: 'Vàng miếng SJC',
    domesticBuyVnd: 78_000_000,
    domesticSellVnd: 79_500_000,
    worldPerLuongVnd: 75_000_000,
    diffBuyVnd: 3_000_000,
    diffBuyPercent: 4,
    diffSellVnd: 4_500_000,
    diffSellPercent: 6,
    ...overrides,
  };
}

describe('CompareTable', () => {
  it('render đủ cột (Sản phẩm, Bán ra, Thế giới quy đổi, Chênh lệch) và định dạng tiền theo vi-VN', () => {
    render(<CompareTable rows={[row()]} />);

    expect(screen.getByRole('columnheader', { name: 'Sản phẩm' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Bán ra (đ/lượng)' })).toBeInTheDocument();
    expect(screen.getByText('Vàng miếng SJC')).toBeInTheDocument();
    expect(screen.getByText('79.500.000')).toBeInTheDocument();
    expect(screen.getByText('75.000.000')).toBeInTheDocument();
    expect(screen.getByText('+6%')).toBeInTheDocument();
  });

  it('chênh lệch dương dùng tông warning (trong nước đắt hơn)', () => {
    render(<CompareTable rows={[row({ diffSellPercent: 5 })]} />);
    expect(screen.getByText('+5%')).toHaveClass('text-warning');
  });

  it('chênh lệch âm dùng tông success (trong nước rẻ hơn)', () => {
    render(<CompareTable rows={[row({ diffSellPercent: -3 })]} />);
    expect(screen.getByText('-3%')).toHaveClass('text-success');
  });

  it('chênh lệch bằng 0 dùng tông trung tính', () => {
    render(<CompareTable rows={[row({ diffSellPercent: 0 })]} />);
    expect(screen.getByText('0%')).toHaveClass('text-muted-foreground');
  });

  it('nhiều dòng: mỗi dòng có key riêng theo vendor+product, không lỗi trùng key', () => {
    render(
      <CompareTable
        rows={[
          row({ vendor: 'SJC', product: 'Vàng miếng SJC' }),
          row({ vendor: 'PNJ', product: 'Vàng miếng PNJ' }),
        ]}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 data row
  });
});
