/**
 * Thống kê tín hiệu lịch sử của engine phân tích (Đợt 8 — kiểm chứng bộ quy tắc, KHÔNG phải công
 * cụ giao dịch): đếm số lần phân loại tổng hợp chuyển sang Mua/Bán và phân bố theo năm.
 *
 * Chạy: `npm run signal-stats`. Khi chưa có Supabase thật, dùng dữ liệu MẪU (random walk gắn nhãn
 * SAMPLE_ trong `lib/fixtures/xauusd.ts`) — số liệu chỉ minh họa hành vi engine, không phải thị
 * trường thật. Số liệu tái lập được (fixture seed cố định).
 */
import { SAMPLE_XAUUSD_DAILY, SAMPLE_XAUUSD_HOURLY } from '@/lib/fixtures/xauusd';
import { DEFAULT_ANALYSIS_CONFIG, summarizeSignalHistory } from '@/lib/analysis';
import type { Candle } from '@/lib/candles/types';

function printSummary(label: string, candles: readonly Candle[]): void {
  const summary = summarizeSignalHistory(candles, DEFAULT_ANALYSIS_CONFIG);
  console.log(`\n== ${label} (${candles.length} nến) ==`);
  console.log(`Tổng: ${summary.totalBuy} tín hiệu Mua · ${summary.totalSell} tín hiệu Bán`);
  for (const year of Object.keys(summary.byYear).sort()) {
    const bucket = summary.byYear[year];
    if (bucket) console.log(`  ${year}: Mua ${bucket.buy} · Bán ${bucket.sell}`);
  }
  const last = summary.events.at(-1);
  if (last) {
    console.log(
      `Tín hiệu gần nhất: ${last.direction === 'buy' ? 'Mua' : 'Bán'} tại ${last.ts} (điểm ${last.score.toFixed(2)})`,
    );
  }
}

console.log('Thống kê tín hiệu engine phân tích — dữ liệu MẪU (không phải giá thật).');
console.log('Chỉ mang tính kiểm chứng quy tắc, không phải lời khuyên đầu tư.');
printSummary('XAU/USD daily (mẫu)', SAMPLE_XAUUSD_DAILY);
printSummary('XAU/USD 1h (mẫu)', SAMPLE_XAUUSD_HOURLY);
