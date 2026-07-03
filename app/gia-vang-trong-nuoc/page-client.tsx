'use client';

import Link from 'next/link';
import { FreshnessBadge } from '@/components/domestic-gold/freshness-badge';
import { PriceTable } from '@/components/domestic-gold/price-table';
import { useDomesticGold } from '@/components/domestic-gold/use-domestic-gold';
import { ThemeToggle } from '@/components/theme-toggle';
import { latestTimestamp } from '@/lib/domestic-gold/freshness';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

// Nhãn hiển thị cho `source` của TỪNG DÒNG giá (tên provider ingest, khác `source` toàn response ở
// useDomesticGold — xem app/api/domestic-gold/route.ts). vang.today chỉ dùng khi BTMC lỗi (ADR-0006)
// nên nhãn phải phản ánh ĐÚNG provider thực tế đã ghi dữ liệu, không hard-code cứng "BTMC".
const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  btmc: 'Bảo Tín Minh Châu (BTMC)',
  'vang-today': 'vang.today (dự phòng)',
  sample: 'dữ liệu mẫu (demo)',
};

function sourceLabel(prices: readonly DomesticGoldPrice[]): string {
  const providers = [...new Set(prices.map((p) => p.source))];
  return providers.map((p) => PROVIDER_LABELS[p] ?? p).join(', ');
}

export function DomesticGoldPageClient() {
  const { status, prices, source, error } = useDomesticGold();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← Xgold
          </Link>
          <h1 className="text-2xl font-semibold">Giá vàng trong nước</h1>
        </div>
        <ThemeToggle />
      </div>

      {source === 'sample' && (
        <p
          role="status"
          className="bg-warning/10 border-warning/40 text-foreground rounded-md border px-3 py-2 text-sm"
        >
          Đang hiển thị <strong>dữ liệu mẫu</strong> (chưa kết nối Supabase) — không phải giá thật.
        </p>
      )}

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

      {status === 'success' && prices.length === 0 && (
        <div
          role="status"
          className="text-muted-foreground border-border flex h-[240px] items-center justify-center rounded-lg border border-dashed"
        >
          Chưa có dữ liệu giá vàng trong nước.
        </div>
      )}

      {status === 'success' && prices.length > 0 && (
        <>
          <FreshnessBadge latestTs={latestTimestamp(prices)} />
          <PriceTable prices={prices} />
          <p className="text-muted-foreground text-xs">
            Nguồn: {sourceLabel(prices)}. Giá chỉ mang tính tham khảo, không phải lời khuyên đầu tư.
          </p>
        </>
      )}
    </main>
  );
}
