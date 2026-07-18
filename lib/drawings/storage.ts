import { type Drawing, DrawingsStateSchema } from './types';

/** Key localStorage cho công cụ vẽ, tách theo từng symbol. */
function storageKey(symbol: string): string {
  return `xgold:drawings:${symbol}`;
}

/**
 * Đọc danh sách công cụ vẽ đã lưu cho `symbol`. Phòng thủ: không có / JSON hỏng / sai schema → trả
 * mảng RỖNG (không throw), để UI luôn nhận dữ liệu hợp lệ.
 */
export function loadDrawings(symbol: string): Drawing[] {
  const raw = localStorage.getItem(storageKey(symbol));
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = DrawingsStateSchema.safeParse(parsed);
  if (!result.success) return [];

  return result.data;
}

/** Ghi danh sách công cụ vẽ cho `symbol` vào localStorage. */
export function saveDrawings(symbol: string, drawings: Drawing[]): void {
  localStorage.setItem(storageKey(symbol), JSON.stringify(drawings));
}
