import { z } from 'zod';
import { AnalysisConfigSchema, DEFAULT_ANALYSIS_CONFIG } from '@/lib/analysis/config';

const MaLineSchema = z.object({
  id: z.string(),
  type: z.enum(['SMA', 'EMA']),
  period: z.number().int().positive(),
  color: z.string(),
  visible: z.boolean(),
});

const RsiLineSchema = z.object({
  id: z.string(),
  period: z.number().int().positive(),
  color: z.string(),
  visible: z.boolean(),
});

const MacdSettingsSchema = z
  .object({
    visible: z.boolean(),
    fast: z.number().int().positive(),
    slow: z.number().int().positive(),
    signal: z.number().int().positive(),
  })
  .refine((s) => s.fast < s.slow, { message: 'MACD: fast phải nhỏ hơn slow' });

const BollingerSettingsSchema = z.object({
  visible: z.boolean(),
  period: z.number().int().positive(),
  multiplier: z.number().positive(),
});

const IchimokuSettingsSchema = z.object({
  visible: z.boolean(),
  conversionPeriod: z.number().int().positive(),
  basePeriod: z.number().int().positive(),
  spanBPeriod: z.number().int().positive(),
  displacement: z.number().int().positive(),
});

export type MacdSettings = z.infer<typeof MacdSettingsSchema>;
export type BollingerSettings = z.infer<typeof BollingerSettingsSchema>;
export type IchimokuSettings = z.infer<typeof IchimokuSettingsSchema>;

export const DEFAULT_MACD_SETTINGS: MacdSettings = {
  visible: false,
  fast: 12,
  slow: 26,
  signal: 9,
};

export const DEFAULT_BOLLINGER_SETTINGS: BollingerSettings = {
  visible: false,
  period: 20,
  multiplier: 2,
};

/** ADR-0011 — mây Ichimoku (chỉ vẽ Span A/B, không Conversion/Base/Chikou riêng lẻ). */
export const DEFAULT_ICHIMOKU_SETTINGS: IchimokuSettings = {
  visible: false,
  conversionPeriod: 9,
  basePeriod: 26,
  spanBPeriod: 52,
  displacement: 26,
};

function hasUniqueIds(lines: readonly { id: string }[]): boolean {
  return new Set(lines.map((l) => l.id)).size === lines.length;
}

// `id` trùng trong cùng 1 mảng khiến updateMaLine/updateRsiLine (khớp theo id, xem
// indicator-panel.tsx) áp nhầm thay đổi lên nhiều dòng cùng lúc — chặn ngay từ khi giải mã cấu
// hình từ URL/localStorage (F-006, docs/ops/COMPLETION-PLAN.md W-302).
export const ChartConfigSchema = z
  .object({
    maLines: z.array(MaLineSchema),
    rsiLines: z.array(RsiLineSchema),
    // `.default()` giữ tương thích ngược: URL/localStorage cũ (trước Đợt 6/7) không có các khóa
    // này — giải mã vẫn thành công với giá trị mặc định thay vì trả null làm mất cấu hình cũ.
    macd: MacdSettingsSchema.default(DEFAULT_MACD_SETTINGS),
    bollinger: BollingerSettingsSchema.default(DEFAULT_BOLLINGER_SETTINGS),
    ichimoku: IchimokuSettingsSchema.default(DEFAULT_ICHIMOKU_SETTINGS),
    analysis: AnalysisConfigSchema.default(DEFAULT_ANALYSIS_CONFIG),
  })
  .refine((c) => hasUniqueIds(c.maLines), { message: 'maLines có id trùng nhau' })
  .refine((c) => hasUniqueIds(c.rsiLines), { message: 'rsiLines có id trùng nhau' });

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  maLines: [
    { id: 'ma-20', type: 'SMA', period: 20, color: '#facc15', visible: true },
    { id: 'ma-50', type: 'SMA', period: 50, color: '#38bdf8', visible: true },
    { id: 'ma-200', type: 'SMA', period: 200, color: '#f472b6', visible: true },
  ],
  rsiLines: [{ id: 'rsi-14', period: 14, color: '#a78bfa', visible: true }],
  macd: DEFAULT_MACD_SETTINGS,
  bollinger: DEFAULT_BOLLINGER_SETTINGS,
  ichimoku: DEFAULT_ICHIMOKU_SETTINGS,
  analysis: DEFAULT_ANALYSIS_CONFIG,
};

/** Mã hóa cấu hình chỉ báo thành 1 chuỗi query param — nền tảng cho "URL chia sẻ được". */
export function encodeChartConfig(config: ChartConfig): string {
  return encodeURIComponent(btoa(JSON.stringify(config)));
}

/** Giải mã + validate bằng Zod — trả `null` nếu chuỗi hỏng/bị sửa tay thay vì làm crash trang. */
export function decodeChartConfig(raw: string): ChartConfig | null {
  try {
    const json: unknown = JSON.parse(atob(decodeURIComponent(raw)));
    const parsed = ChartConfigSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
