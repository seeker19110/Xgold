import { z } from 'zod';

// "buy" = giá vendor MUA vào (trả khách bán), "sell" = giá vendor BÁN ra (khách mua) — quy ước bán lẻ
// vàng trong nước: sell luôn >= buy. Khớp CHECK constraint của bảng domestic_gold_prices (migration).
export const DomesticGoldPriceSchema = z
  .object({
    vendor: z.string().min(1),
    product: z.string().min(1),
    buy: z.number().positive(),
    sell: z.number(),
    ts: z.string(), // ISO 8601 UTC
    source: z.string().min(1),
  })
  .refine((p) => p.sell >= p.buy, { message: 'sell phải >= buy' });

export type DomesticGoldPrice = z.infer<typeof DomesticGoldPriceSchema>;

export interface DomesticGoldProvider {
  readonly name: string;
  fetchPrices(): Promise<DomesticGoldPrice[]>;
}
