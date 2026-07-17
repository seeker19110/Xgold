import { z } from 'zod';
import { isSupportedSymbol } from '@/lib/instruments';

/**
 * Watchlist (W-509) — danh sách MÃ ĐÃ GHIM, chỉ lưu `localStorage` (quyết định PLAN mục 3: KHÔNG
 * đồng bộ thiết bị). Trạng thái tối giản: mảng symbol chuẩn (chữ hoa, khớp registry), thứ tự = thứ
 * tự ghim. Toàn bộ hiển thị giá/tín hiệu được tính lại lúc chạy từ `/api/candles`, KHÔNG lưu ở đây.
 */
export const WATCHLIST_STORAGE_KEY = 'xgold:watchlist';

export const watchlistSchema = z.array(z.string());
export type Watchlist = z.infer<typeof watchlistSchema>;

/** Chuỗi JSON để ghi localStorage. */
export function serializeWatchlist(symbols: readonly string[]): string {
  return JSON.stringify(symbols);
}

/**
 * Đọc watchlist từ chuỗi localStorage một cách phòng thủ: JSON hỏng / sai schema → trả mảng RỖNG
 * (không throw). Ngoài validate schema còn: (1) loại symbol không còn trong registry (registry đổi,
 * dữ liệu cũ), (2) bỏ trùng giữ thứ tự lần ghim đầu — để UI luôn nhận danh sách sạch, hợp lệ.
 */
export function deserializeWatchlist(raw: string | null): Watchlist {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = watchlistSchema.safeParse(parsed);
  if (!result.success) return [];

  const seen = new Set<string>();
  return result.data.filter((symbol) => {
    if (seen.has(symbol) || !isSupportedSymbol(symbol)) return false;
    seen.add(symbol);
    return true;
  });
}
