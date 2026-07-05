import type { GoldPriceComparisonRow } from '@/lib/gold-compare/convert';

interface CompareTableProps {
  rows: GoldPriceComparisonRow[];
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');
const percentFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

function DiffCell({ percent }: { percent: number }) {
  // Dương = trong nước ĐẮT hơn thế giới (tông cảnh báo), âm = RẺ hơn (tông thành công) — không phải
  // lời khuyên mua/bán, chỉ mô tả chênh lệch giá.
  const tone =
    percent > 0 ? 'text-warning' : percent < 0 ? 'text-success' : 'text-muted-foreground';
  return <span className={`tabular-nums ${tone}`}>{percentFormatter.format(percent)}%</span>;
}

export function CompareTable({ rows }: CompareTableProps) {
  return (
    <div
      className="border-border overflow-x-auto rounded-lg border"
      role="region"
      aria-label="Bảng so sánh giá vàng trong nước và thế giới"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b">
            <th scope="col" className="px-3 py-3 font-medium">
              Sản phẩm
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Bán ra (đ/lượng)
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Thế giới quy đổi (đ/lượng)
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Chênh lệch (bán ra)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.vendor}::${row.product}`}
              className="border-border border-b last:border-0"
            >
              <td className="px-3 py-3">{row.product}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {currencyFormatter.format(row.domesticSellVnd)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {currencyFormatter.format(Math.round(row.worldPerLuongVnd))}
              </td>
              <td className="px-3 py-3 text-right">
                <DiffCell percent={row.diffSellPercent} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
