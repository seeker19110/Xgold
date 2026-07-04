import { z } from 'zod';
import { RULE_IDS } from '@/lib/analysis/types';

const RuleSettingSchema = z.object({
  enabled: z.boolean(),
  weight: z.number().min(0).max(1),
});

export type RuleSetting = z.infer<typeof RuleSettingSchema>;

/**
 * Cấu hình engine phân tích kết hợp (bật/tắt + trọng số từng quy tắc, ngưỡng phân loại).
 * Tham số chu kỳ của từng quy tắc (SMA 50/200, RSI 14…) cố định ở DEFAULT_ANALYSIS_PARAMS — v1
 * không cho chỉnh qua UI (kế hoạch mục 4.4, người dùng chốt 2026-07-04).
 */
export const AnalysisConfigSchema = z.object({
  enabled: z.boolean(),
  // Ngưỡng phân loại đối xứng: score >= buyThreshold → Mua; score <= -buyThreshold → Bán.
  buyThreshold: z.number().gt(0).max(1),
  rules: z.object(
    Object.fromEntries(RULE_IDS.map((id) => [id, RuleSettingSchema])) as Record<
      (typeof RULE_IDS)[number],
      typeof RuleSettingSchema
    >,
  ),
});

export type AnalysisConfig = z.infer<typeof AnalysisConfigSchema>;

/** Trọng số mặc định theo kế hoạch mục 4.4 (R1 0.30 · R2 0.15 · R3 0.20 · R4 0.25 · R5 0.10). */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  enabled: true,
  buyThreshold: 0.25,
  rules: {
    'ma-cross': { enabled: true, weight: 0.3 },
    'price-vs-ma': { enabled: true, weight: 0.15 },
    'rsi-zone': { enabled: true, weight: 0.2 },
    'macd-cross': { enabled: true, weight: 0.25 },
    'bb-touch': { enabled: true, weight: 0.1 },
  },
};
