import { z } from 'zod';

const PointSchema = z.object({ time: z.number().int(), price: z.number() });
// `time` là UTCTimestamp (giây, khớp kiểu Time của lightweight-charts) — KHÔNG theo pixel, để
// toạ độ sống sót qua zoom/pan/đổi timeframe (yêu cầu ADR-0012 + kế hoạch gốc mục 16.1).

export const HorizontalLineDrawingSchema = z.object({
  id: z.string(),
  type: z.literal('horizontal-line'),
  price: z.number(),
  color: z.string(),
});

export const TrendlineDrawingSchema = z.object({
  id: z.string(),
  type: z.literal('trendline'),
  p1: PointSchema,
  p2: PointSchema,
  color: z.string(),
});

export const FibRetracementDrawingSchema = z.object({
  id: z.string(),
  type: z.literal('fib-retracement'),
  p1: PointSchema,
  p2: PointSchema,
});

export const DrawingSchema = z.discriminatedUnion('type', [
  HorizontalLineDrawingSchema,
  TrendlineDrawingSchema,
  FibRetracementDrawingSchema,
]);
export type Drawing = z.infer<typeof DrawingSchema>;

export const DrawingsStateSchema = z.array(DrawingSchema);
