import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

/**
 * Dữ liệu MẪU (KHÔNG phải giá vàng thật) — dùng khi chưa cấu hình Supabase (dev/demo cục bộ) hoặc
 * trong test. Tên hằng số bắt đầu bằng SAMPLE_ để không ai nhầm là dữ liệu thật (CLAUDE.md §4).
 *
 * `ts` tính TƯƠNG ĐỐI theo thời điểm import (vài phút trước "bây giờ") — khác fixture XAU/USD (ngày
 * cố định, vì đó là dữ liệu LỊCH SỬ cho chart nến) — ở đây mục đích là demo badge "độ tươi dữ liệu"
 * (Đợt 5), cần luôn hiển thị hợp lý bất kể chạy demo ngày nào.
 */
function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export const SAMPLE_DOMESTIC_GOLD: readonly DomesticGoldPrice[] = [
  {
    vendor: 'btmc',
    product: 'SJC 1L, 10L, 1KG',
    buy: 97_000_000,
    sell: 99_000_000,
    ts: minutesAgoIso(3),
    source: 'sample',
  },
  {
    vendor: 'btmc',
    product: 'Nhẫn Trơn (999.9)',
    buy: 96_200_000,
    sell: 97_900_000,
    ts: minutesAgoIso(3),
    source: 'sample',
  },
  {
    vendor: 'btmc',
    product: 'Vàng Trang Sức (999)',
    buy: 95_800_000,
    sell: 97_400_000,
    ts: minutesAgoIso(3),
    source: 'sample',
  },
];
