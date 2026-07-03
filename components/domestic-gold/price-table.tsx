import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

interface PriceTableProps {
  prices: DomesticGoldPrice[];
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export function PriceTable({ prices }: PriceTableProps) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b">
            <th scope="col" className="px-3 py-3 font-medium">
              Sản phẩm
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Mua vào (đ)
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Bán ra (đ)
            </th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p) => (
            <tr key={`${p.vendor}::${p.product}`} className="border-border border-b last:border-0">
              <td className="px-3 py-3">{p.product}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {currencyFormatter.format(p.buy)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {currencyFormatter.format(p.sell)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
