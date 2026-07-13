'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ScreenerRow } from '@/components/screener/use-screener';
import { AnalysisDisclaimer } from '@/components/chart/analysis-disclaimer';
import type { SignalDirection } from '@/lib/analysis';

interface ScreenerTableProps {
  rows: ScreenerRow[];
}

const usdFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

function formatPrice(price: number | null, currency: ScreenerRow['currency']): string {
  if (price === null) return '—';
  return currency === 'VND' ? `${vndFormatter.format(price)} đ` : `$${usdFormatter.format(price)}`;
}

const DIRECTION_LABEL: Record<SignalDirection, string> = {
  buy: 'Mua',
  sell: 'Bán',
  neutral: 'Trung lập',
};

const DIRECTION_BADGE: Record<SignalDirection, string> = {
  buy: 'border-success/60 bg-success/10 text-foreground',
  sell: 'border-danger/60 bg-danger/10 text-foreground',
  neutral: 'border-border bg-surface text-foreground',
};

const SOURCE_LABEL: Record<'supabase' | 'sample', string> = {
  supabase: 'Thực',
  sample: 'Mẫu',
};

/**
 * Bảng quét tín hiệu — mỗi mã 1 dòng, sắp xếp theo `norm` (độ mạnh tín hiệu), mặc định giảm dần
 * (Mua mạnh → Bán mạnh), bấm tiêu đề cột "Độ mạnh" để đảo chiều (Đợt 10, mục 3.1/3.3).
 */
export function ScreenerTable({ rows }: ScreenerTableProps) {
  const [sortDescending, setSortDescending] = useState(true);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => (sortDescending ? b.norm - a.norm : a.norm - b.norm));
    return copy;
  }, [rows, sortDescending]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="border-border overflow-x-auto rounded-lg border"
        role="region"
        aria-label="Bảng quét tín hiệu kỹ thuật theo mã"
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b">
              <th scope="col" className="px-3 py-3 font-medium">
                Mã
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Giá mới nhất
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Tín hiệu
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => setSortDescending((v) => !v)}
                  className="min-h-11 font-medium underline-offset-2 hover:underline"
                  aria-label={`Sắp xếp theo độ mạnh, hiện đang ${sortDescending ? 'giảm dần' : 'tăng dần'}`}
                >
                  Độ mạnh {sortDescending ? '▼' : '▲'}
                </button>
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                RSI(14)
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Xu hướng
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Nguồn
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.symbol} className="border-border border-b last:border-0">
                <td className="px-3 py-3 font-medium">
                  <Link href={`/chart/${row.slug}`} className="hover:underline">
                    {row.label}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatPrice(row.latestClose, row.currency)}
                </td>
                <td className="px-3 py-3">
                  {row.direction ? (
                    <span
                      className={`inline-flex min-h-11 items-center rounded-md border px-2 py-1 ${DIRECTION_BADGE[row.direction]}`}
                    >
                      {DIRECTION_LABEL[row.direction]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {row.direction ? `${row.norm >= 0 ? '+' : ''}${row.norm.toFixed(2)}` : '—'}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.rsi14 !== null ? row.rsi14.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-3">
                  {row.trend === 'up' ? 'Tăng' : row.trend === 'down' ? 'Giảm' : '—'}
                </td>
                <td className="px-3 py-3">{row.source ? SOURCE_LABEL[row.source] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-xs">
        Theo bộ quy tắc mặc định (v1 screener chưa hỗ trợ chỉnh cấu hình — xem trang chart để tùy
        biến quy tắc).
      </p>
      <AnalysisDisclaimer />
    </div>
  );
}
