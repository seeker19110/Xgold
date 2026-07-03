export type FreshnessStatus = 'fresh' | 'stale' | 'unknown';

/**
 * Ngưỡng "dữ liệu cũ" = 2× chu kỳ thu thập dự kiến (pg_cron mỗi 15 phút — xem
 * supabase/functions/ingest-domestic-gold/README.md) — khớp nguyên tắc resilience đã đặt ra ở
 * docs/plans/xgold-mvp-plan.md mục 7 điểm 4.
 */
export const STALE_THRESHOLD_MINUTES = 30;

export function getFreshnessStatus(
  latestTs: string | null,
  now: number = Date.now(),
  thresholdMinutes: number = STALE_THRESHOLD_MINUTES,
): FreshnessStatus {
  if (!latestTs) return 'unknown';
  const parsedMs = Date.parse(latestTs);
  if (Number.isNaN(parsedMs)) return 'unknown';
  const ageMs = now - parsedMs;
  return ageMs > thresholdMinutes * 60 * 1000 ? 'stale' : 'fresh';
}

/** `ts` mới nhất trong danh sách giá — `null` nếu danh sách rỗng. */
export function latestTimestamp(prices: readonly { ts: string }[]): string | null {
  if (prices.length === 0) return null;
  return prices.reduce(
    (latest, p) => (Date.parse(p.ts) > Date.parse(latest) ? p.ts : latest),
    prices[0]!.ts,
  );
}
