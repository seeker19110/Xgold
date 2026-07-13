import type { Candle } from '@/lib/candles/types';
import { atr, bollinger, ichimokuCloud, macd, rsi, sma } from '@/lib/indicators';
import {
  DEFAULT_ANALYSIS_PARAMS,
  type AnalysisInputs,
  type AnalysisParams,
} from '@/lib/analysis/types';

/** Tính sẵn mọi chuỗi chỉ báo mà các quy tắc cần — mỗi chỉ báo tính đúng 1 lần cho cả lịch sử. */
export function computeAnalysisInputs(
  candles: readonly Candle[],
  params: AnalysisParams = DEFAULT_ANALYSIS_PARAMS,
): AnalysisInputs {
  return {
    ts: candles.map((c) => c.ts),
    closes: candles.map((c) => c.close),
    maFast: sma(candles, params.maFastPeriod).map((p) => p.value),
    maSlow: sma(candles, params.maSlowPeriod).map((p) => p.value),
    rsi: rsi(candles, params.rsiPeriod).map((p) => p.value),
    macd: macd(candles, params.macdFast, params.macdSlow, params.macdSignal),
    bb: bollinger(candles, params.bbPeriod, params.bbMultiplier),
    rsiFast: rsi(candles, params.rsiStackFastPeriod).map((p) => p.value),
    rsiSlow: rsi(candles, params.rsiStackSlowPeriod).map((p) => p.value),
    ichimoku: ichimokuCloud(
      candles,
      params.ichimokuConversionPeriod,
      params.ichimokuBasePeriod,
      params.ichimokuSpanBPeriod,
    ),
    atr: atr(candles, params.atrPeriod).map((p) => p.value),
  };
}
