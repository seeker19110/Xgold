export { evaluateAt, suggestLatest, signalEvents } from '@/lib/analysis/combine';
export {
  summarizeSignalHistory,
  evaluatePerformance,
  walkForward,
  type SignalHistorySummary,
  type PerformanceReport,
  type WalkForwardFold,
  type WalkForwardReport,
} from '@/lib/analysis/backtest';
export {
  labelSignals,
  DEFAULT_LABEL_OPTIONS,
  type LabelOptions,
  type LabelOutcome,
  type LabeledSignal,
  type LabelingResult,
} from '@/lib/analysis/labeling';
export {
  buildCalibration,
  calibratedProbability,
  brierScore,
  wilsonInterval,
  poolAdjacentViolators,
  DEFAULT_CALIBRATION_OPTIONS,
  type CalibrationBin,
  type CalibrationTable,
  type CalibratedProbability,
  type CalibrationOptions,
} from '@/lib/analysis/calibration';
export { computeAnalysisInputs } from '@/lib/analysis/inputs';
export {
  AnalysisConfigSchema,
  DEFAULT_ANALYSIS_CONFIG,
  type AnalysisConfig,
  type RuleSetting,
} from '@/lib/analysis/config';
export {
  RULE_IDS,
  DEFAULT_ANALYSIS_PARAMS,
  type AnalysisInputs,
  type AnalysisParams,
  type RuleId,
  type RuleSignal,
  type RuleVerdict,
  type SignalDirection,
  type SignalEvent,
  type Suggestion,
} from '@/lib/analysis/types';
export {
  computeConfluence,
  CONFLUENCE_TIMEFRAMES,
  CONFLUENCE_THRESHOLD,
  CONFLUENCE_WEIGHTS,
  type Confluence,
  type TimeframeVerdict,
  type ConfluenceTimeframe,
} from '@/lib/analysis/multi-timeframe';
export {
  detectRegime,
  efficiencyRatio,
  RULE_FAMILY,
  REGIME_FAMILY_MULTIPLIER,
  REDUNDANCY_FACTOR,
  type MarketRegime,
  type RuleFamily,
  type RegimeAssessment,
} from '@/lib/analysis/regime';
export { ratioSeries, simpleReturns, pearson, correlationXauDxy } from '@/lib/analysis/ratio';
export {
  computeTradeLevels,
  TP1_R_MULTIPLE,
  TP2_R_MULTIPLE,
  type TradeLevels,
  type RiskLevel,
} from '@/lib/analysis/trade-levels';
