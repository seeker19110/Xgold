export { evaluateAt, suggestLatest, signalEvents } from '@/lib/analysis/combine';
export { summarizeSignalHistory, type SignalHistorySummary } from '@/lib/analysis/backtest';
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
