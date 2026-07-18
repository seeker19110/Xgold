import { z } from 'zod';
import { isSupportedSymbol } from '@/lib/instruments';

/**
 * Cảnh báo giá v1 (W-514) — client-side thuần: kiểm tra khi tab đang mở, thông báo qua Notification
 * API. KHÔNG có Supabase/backend (quyết định phạm vi PLAN Đợt 17). Lưu mảng ở `localStorage` key
 * dưới đây (đọc/ghi qua hook `use-alerts.ts`, cùng pattern SSR-safe với `use-watchlist.ts`).
 */
export const ALERTS_STORAGE_KEY = 'xgold:alerts';

export const ALERT_DIRECTIONS = ['above', 'below'] as const;
export type AlertDirection = (typeof ALERT_DIRECTIONS)[number];

/**
 * Một cảnh báo giá. `targetPrice` phải > 0 và hữu hạn (giá không âm). `triggeredAt` `null` = đang
 * hoạt động (chưa kích hoạt); chuỗi ISO UTC = đã bắn thông báo (không bắn lại). Thời gian luôn UTC
 * (`toISOString`) để không lệ thuộc múi giờ máy.
 */
export const priceAlertSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  direction: z.enum(ALERT_DIRECTIONS),
  targetPrice: z.number().positive().finite(),
  createdAt: z.string().min(1),
  triggeredAt: z.string().min(1).nullable(),
});
export type PriceAlert = z.infer<typeof priceAlertSchema>;

export const priceAlertsSchema = z.array(priceAlertSchema);
export type PriceAlerts = PriceAlert[];

/** Chuỗi JSON để ghi localStorage. */
export function serializeAlerts(alerts: readonly PriceAlert[]): string {
  return JSON.stringify(alerts);
}

/**
 * Đọc mảng alert từ chuỗi localStorage một cách phòng thủ: null/JSON hỏng/sai schema → mảng RỖNG
 * (không throw). Ngoài validate schema còn loại alert của mã không còn trong registry (registry đổi
 * / dữ liệu cũ) — để UI luôn nhận danh sách sạch, hợp lệ.
 */
export function deserializeAlerts(raw: string | null): PriceAlerts {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = priceAlertsSchema.safeParse(parsed);
  if (!result.success) return [];

  return result.data.filter((alert) => isSupportedSymbol(alert.symbol));
}

/**
 * Điều kiện giá đã chạm ngưỡng, TÁCH riêng khỏi hook để test tính tay dễ dàng (PLAN W-514):
 * - `above`: giá đóng cửa mới nhất ≥ ngưỡng (đã vượt LÊN trên, kể cả đúng bằng mức).
 * - `below`: giá đóng cửa mới nhất ≤ ngưỡng (đã xuống DƯỚI, kể cả đúng bằng mức).
 *
 * Chỉ xét giá vs hướng — việc lọc alert đang hoạt động (`triggeredAt === null`) và đúng symbol do
 * nơi gọi lo, giữ hàm này thuần và biên rõ ràng. Ca biên "đúng bằng mức giá" → `true` (chạm là bắn).
 */
export function shouldTrigger(alert: PriceAlert, latestClose: number): boolean {
  return alert.direction === 'above'
    ? latestClose >= alert.targetPrice
    : latestClose <= alert.targetPrice;
}
