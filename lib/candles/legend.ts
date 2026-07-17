import type { Candle, Timeframe } from '@/lib/candles/types';
import { timeframeDurationSeconds } from '@/lib/candles/resample';

/**
 * Dữ liệu chú giải OHLC kiểu TradingView cho MỘT nến: giá mở/cao/thấp/đóng + mức thay đổi so với
 * giá đóng cửa của nến TRƯỚC (đúng quy ước legend TradingView — không phải close−open của chính nó).
 */
export interface OhlcLegend {
  open: number;
  high: number;
  low: number;
  close: number;
  /** close − close nến trước. Nến đầu tiên (không có nến trước): so với open của chính nó. */
  change: number;
  /** % thay đổi trên cùng mốc so sánh. 0 nếu mốc so sánh là 0 (tránh chia 0). */
  changePct: number;
  direction: 'up' | 'down' | 'flat';
}

/** Tính chú giải cho nến tại `index`. Trả `null` nếu index ngoài mảng. */
export function legendAt(candles: readonly Candle[], index: number): OhlcLegend | null {
  const candle = candles[index];
  if (!candle) return null;

  const baseline = index > 0 ? (candles[index - 1]?.close ?? candle.open) : candle.open;
  const change = candle.close - baseline;
  const changePct = baseline !== 0 ? (change / baseline) * 100 : 0;

  return {
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    change,
    changePct,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

/** Định dạng giá cho legend — 2 chữ số thập phân, khớp quy ước hiển thị giá của app (toFixed(2)). */
export function formatLegendPrice(value: number): string {
  return value.toFixed(2);
}

/** Định dạng mức thay đổi kèm dấu, vd "+12.34 (+0.37%)" / "−5.00 (−0.15%)". */
export function formatLegendChange(legend: OhlcLegend): string {
  const sign = legend.change > 0 ? '+' : legend.change < 0 ? '−' : '';
  const abs = Math.abs(legend.change).toFixed(2);
  const absPct = Math.abs(legend.changePct).toFixed(2);
  return `${sign}${abs} (${sign}${absPct}%)`;
}

/** Kết quả countdown nến hiện tại — `label` đã định dạng sẵn cho legend. */
export interface CandleCountdown {
  label: string;
  secondsRemaining: number;
}

/** `mm:ss` khi còn dưới 1 giờ, `hh:mm:ss` khi còn từ 1 giờ trở lên (2 chữ số mỗi phần). */
function formatCountdownLabel(secondsRemaining: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  if (secondsRemaining >= 3600) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Thời gian còn lại tới khi nến hiện tại (nến đang mở, mới nhất) đóng lại — cho countdown ở legend
 * chart. Mốc đóng = thời điểm mở của nến (`latestCandleTs`) + độ dài khung (`timeframeDurationSeconds`).
 * Trả `null` khi không tính được (khung không có độ dài cố định — vd `1M` — hoặc `latestCandleTs`
 * không parse được), KHÔNG throw. Nhận `now` từ tham số (không đọc `Date.now()`) để hàm thuần, test
 * tất định.
 */
export function candleCountdown(
  timeframe: Timeframe,
  latestCandleTs: string,
  now: Date,
): CandleCountdown | null {
  const durationSeconds = timeframeDurationSeconds(timeframe);
  if (durationSeconds === null) return null;

  const openMs = Date.parse(latestCandleTs);
  if (Number.isNaN(openMs)) return null;

  const closeMs = openMs + durationSeconds * 1000;
  const secondsRemaining = Math.max(0, Math.round((closeMs - now.getTime()) / 1000));

  return { label: formatCountdownLabel(secondsRemaining), secondsRemaining };
}
