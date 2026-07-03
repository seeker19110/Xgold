import { getFreshnessStatus, type FreshnessStatus } from '@/lib/domestic-gold/freshness';

interface FreshnessBadgeProps {
  latestTs: string | null;
}

function formatAgo(latestTs: string | null): string {
  if (!latestTs) return 'chưa có dữ liệu';
  const ms = Date.now() - Date.parse(latestTs);
  if (Number.isNaN(ms)) return 'không rõ thời điểm';
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  return `${Math.round(minutes / 60)} giờ trước`;
}

const TONE: Record<FreshnessStatus, string> = {
  fresh: 'border-success/40 text-foreground',
  stale: 'border-warning/40 text-foreground',
  unknown: 'border-border text-muted-foreground',
};

const ICON: Record<FreshnessStatus, string> = {
  fresh: '●',
  stale: '▲',
  unknown: '?',
};

/** Badge "độ tươi dữ liệu" (PROJECT.md mục 2 Should have) — cảnh báo khi nguồn có thể đang gián đoạn
 * thay vì âm thầm hiển thị giá cũ như giá mới (xem docs/plans/xgold-mvp-plan.md mục 7 điểm 4). */
export function FreshnessBadge({ latestTs }: FreshnessBadgeProps) {
  const status = getFreshnessStatus(latestTs);
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${TONE[status]}`}
    >
      <span aria-hidden="true">{ICON[status]}</span>
      Cập nhật: {formatAgo(latestTs)}
      {status === 'stale' && ' — nguồn có thể đang gián đoạn'}
    </span>
  );
}
