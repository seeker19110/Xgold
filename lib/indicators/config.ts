import { z } from 'zod';
import type { MaLine, RsiLine } from '@/lib/indicators/types';

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

export const ChartConfigSchema = z.object({
  maLines: z.array(MaLineSchema),
  rsiLines: z.array(RsiLineSchema),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  maLines: [
    { id: 'ma-20', type: 'SMA', period: 20, color: '#facc15', visible: true },
    { id: 'ma-50', type: 'SMA', period: 50, color: '#38bdf8', visible: true },
    { id: 'ma-200', type: 'SMA', period: 200, color: '#f472b6', visible: true },
  ],
  rsiLines: [{ id: 'rsi-14', period: 14, color: '#a78bfa', visible: true }],
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

export type { MaLine, RsiLine };
