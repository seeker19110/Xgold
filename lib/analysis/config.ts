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
  /**
   * Số nến của EMA làm trơn điểm tổng hợp TRƯỚC khi phân ngưỡng (ADR-0015). 0 = tắt.
   * Nhiễu của engine nằm ở chỗ DẤU của điểm lật qua lật lại chứ không phải điểm dao động quanh
   * ngưỡng — nên làm trơn chính chuỗi điểm mới trúng nguyên nhân (dead band quanh ngưỡng đã đo là
   * vô dụng, thậm chí làm tệ hơn).
   */
  smoothingSpan: z.number().int().min(0).max(50).default(8),
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
 * Trọng số mặc định. Sau khi gỡ `macd-cross` (ADR-0014) rồi `rsi-zone` + `bb-touch` (ADR-0015),
 * 4 trọng số còn lại được nhân đều ×4/3 để giữ quy ước tổng = 1.0. Phép nhân này KHÔNG đổi hành
 * vi: từ ADR-0013, ngưỡng phân loại là tỷ lệ trên `maxScore`, nên thang tuyệt đối của trọng số
 * không còn ảnh hưởng — chỉ TỶ LỆ giữa các quy tắc mới có ý nghĩa.
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  enabled: true,
  combineMode: 'grouped',
  regimeAware: true,
  smoothingSpan: 8,
  buyThreshold: 0.25,
  rules: {
    'ma-cross': { enabled: true, weight: 0.4167 },
    'price-vs-ma': { enabled: true, weight: 0.1667 },
    'ichimoku-cloud': { enabled: true, weight: 0.25 },
    'rsi-stack': { enabled: true, weight: 0.1666 },
  },
};
