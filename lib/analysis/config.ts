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
  /**
   * `grouped` (mặc định, Đợt C): gộp quy tắc theo nhóm, chiết khấu bằng chứng trùng lặp trong
   * nhóm, và chỉnh trọng số nhóm theo chế độ thị trường. `linear`: cộng thẳng như v1 — giữ lại để
   * đối chiếu và cho cấu hình cũ đã lưu vẫn chạy đúng như trước.
   */
  combineMode: z.enum(['grouped', 'linear']).default('grouped'),
  /** Chỉ có tác dụng ở `grouped`: tắt để gộp nhóm nhưng KHÔNG đổi trọng số theo chế độ. */
  regimeAware: z.boolean().default(true),
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

/**
 * Trọng số mặc định. Sau khi gỡ `macd-cross` (ADR-0014), 6 trọng số còn lại được nhân đều ×1.25 để
 * giữ quy ước tổng = 1.0. Phép nhân này KHÔNG đổi hành vi: từ ADR-0013, ngưỡng phân loại là tỷ lệ
 * trên `maxScore`, nên thang tuyệt đối của trọng số không còn ảnh hưởng — đã đo và xác nhận trùng
 * khớp với phương án giữ tổng 0.8. Chỉ TỶ LỆ giữa các quy tắc mới có ý nghĩa.
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  enabled: true,
  combineMode: 'grouped',
  regimeAware: true,
  buyThreshold: 0.25,
  rules: {
    'ma-cross': { enabled: true, weight: 0.3125 },
    'price-vs-ma': { enabled: true, weight: 0.125 },
    'rsi-zone': { enabled: true, weight: 0.1875 },
    'bb-touch': { enabled: true, weight: 0.0625 },
    'ichimoku-cloud': { enabled: true, weight: 0.1875 },
    'rsi-stack': { enabled: true, weight: 0.125 },
  },
};
