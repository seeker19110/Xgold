import type { MacdPoint } from '@/lib/indicators/macd';
import type { BollingerPoint } from '@/lib/indicators/bollinger';
import type { IchimokuPoint } from '@/lib/indicators/ichimoku';

/** 5 quy tắc v1 (R1–R5, `docs/plans/xgold-development-plan.md` mục 4.4) + R6/R7 (ADR-0011, mây
 * Ichimoku + xếp chồng RSI 10/14/21). */
export const RULE_IDS = [
  'ma-cross',
  'price-vs-ma',
  'rsi-zone',
  'macd-cross',
  'bb-touch',
  'ichimoku-cloud',
  'rsi-stack',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export type SignalDirection = 'buy' | 'sell' | 'neutral';

/** Kết quả thô của một quy tắc tại một nến — chưa gắn trọng số. */
export interface RuleVerdict {
  direction: SignalDirection;
  reason: string;
}

/** Kết quả một quy tắc sau khi gắn trọng số từ cấu hình. */
export interface RuleSignal extends RuleVerdict {
  ruleId: RuleId;
  weight: number;
}

/** Gợi ý tổng hợp tại một nến (nến đã đóng gần nhất khi hiển thị trên UI). */
export interface Suggestion {
  ts: string;
  direction: SignalDirection;
  /** Tổng có trọng số: Mua = +weight, Bán = −weight, Trung lập = 0 cho từng quy tắc đang bật. */
  score: number;
  /** Tổng trọng số các quy tắc đang bật — biên độ tối đa của |score| (0 nếu tắt hết quy tắc). */
  maxScore: number;
  signals: RuleSignal[];
}

/** Thời điểm phân loại tổng hợp CHUYỂN sang Mua/Bán trong lịch sử (đầu vào cho markers/backtest). */
export interface SignalEvent {
  ts: string;
  direction: 'buy' | 'sell';
  score: number;
}

/**
 * Tham số chu kỳ của các quy tắc — cố định ở v1 (không cho chỉnh qua UI), tách thành tham số để
 * unit test được bằng chu kỳ nhỏ tính tay (chuẩn Đợt 3).
 */
export interface AnalysisParams {
  maFastPeriod: number;
  maSlowPeriod: number;
  /** Số nến gần nhất mà một giao cắt MA còn được tính là tín hiệu hiện hành. */
  maCrossLookback: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  macdCrossLookback: number;
  bbPeriod: number;
  bbMultiplier: number;
  /** R6 — mây Ichimoku (ADR-0011): Conversion/Base/Span B Length + độ dịch mây tới trước. */
  ichimokuConversionPeriod: number;
  ichimokuBasePeriod: number;
  ichimokuSpanBPeriod: number;
  ichimokuDisplacement: number;
  /** Số nến gần nhất mà một lần giá vượt biên mây còn được tính là breakout "vừa xảy ra". */
  ichimokuBreakoutLookback: number;
  /** R7 — xếp chồng RSI 10/14/21 (Seeker-RSI): chu kỳ nhanh/chậm (chu kỳ giữa dùng chung `rsiPeriod`). */
  rsiStackFastPeriod: number;
  rsiStackSlowPeriod: number;
  /** ATR dùng chung cho `trade-levels.ts` (Entry/SL/TP, rủi ro — ADR-0011). */
  atrPeriod: number;
}

export const DEFAULT_ANALYSIS_PARAMS: AnalysisParams = {
  maFastPeriod: 50,
  maSlowPeriod: 200,
  maCrossLookback: 10,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  macdCrossLookback: 5,
  bbPeriod: 20,
  bbMultiplier: 2,
  ichimokuConversionPeriod: 9,
  ichimokuBasePeriod: 26,
  ichimokuSpanBPeriod: 52,
  ichimokuDisplacement: 26,
  ichimokuBreakoutLookback: 3,
  rsiStackFastPeriod: 10,
  rsiStackSlowPeriod: 21,
  atrPeriod: 14,
};

/** Chuỗi chỉ báo đã tính sẵn cho toàn bộ nến — mỗi quy tắc đọc theo index, không tính lại. */
export interface AnalysisInputs {
  ts: string[];
  closes: number[];
  maFast: (number | null)[];
  maSlow: (number | null)[];
  rsi: (number | null)[];
  macd: MacdPoint[];
  bb: BollingerPoint[];
  /** RSI 10/21 — cùng với `rsi` (14) tạo bộ Seeker-RSI cho R7 (ADR-0011). */
  rsiFast: (number | null)[];
  rsiSlow: (number | null)[];
  ichimoku: IchimokuPoint[];
  /** ATR(atrPeriod) — dùng cho R6 (chưa dùng trực tiếp) và `trade-levels.ts`. */
  atr: (number | null)[];
}
