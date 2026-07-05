'use client';

import Link from 'next/link';
import { CompareTable } from '@/components/gold-compare/compare-table';
import { useGoldCompare } from '@/components/gold-compare/use-gold-compare';
import { ThemeToggle } from '@/components/theme-toggle';

function formatAsOf(ts: string | null): string {
  if (!ts) return 'không rõ thời điểm';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'không rõ thời điểm';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export function GoldComparePageClient() {
  const { status, rows, worldAsOfTs, error } = useGoldCompare();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← Xgold
          </Link>
          <h1 className="text-2xl font-semibold">So sánh giá vàng trong nước &amp; thế giới</h1>
        </div>
        <ThemeToggle />
      </div>

      <p className="text-muted-foreground text-sm">
        Quy đổi giá vàng thế giới (XAU/USD) sang VND/lượng theo tỷ giá USD/VND, so với giá vàng
        trong nước hiện tại (1 lượng = 37,5g; 1 troy ounce = 31,1034768g).
      </p>

      {status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex h-[240px] items-center justify-center"
        >
          Đang tải dữ liệu…
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="border-danger text-danger flex h-[240px] items-center justify-center rounded-lg border"
        >
          Không tải được dữ liệu: {error}
        </div>
      )}

      {status === 'success' && rows.length === 0 && (
        <div
          role="status"
          className="text-muted-foreground border-border flex h-[240px] items-center justify-center rounded-lg border border-dashed"
        >
          Chưa đủ dữ liệu để so sánh (thiếu giá trong nước hoặc giá thế giới/tỷ giá).
        </div>
      )}

      {status === 'success' && rows.length > 0 && (
        <>
          <p className="text-muted-foreground text-xs">
            Giá thế giới tính theo nến 1D gần nhất, tính đến: {formatAsOf(worldAsOfTs)}.
          </p>
          <CompareTable rows={rows} />
          <p className="text-muted-foreground text-xs">
            Số liệu chỉ mang tính tham khảo, không phải lời khuyên đầu tư. Chênh lệch dương nghĩa là
            giá trong nước đang cao hơn giá thế giới quy đổi.
          </p>
        </>
      )}
    </main>
  );
}
