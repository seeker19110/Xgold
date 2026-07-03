import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase/client';
import { SAMPLE_DOMESTIC_GOLD } from '@/lib/fixtures/domestic-gold';
import type { DomesticGoldPrice } from '@/lib/providers-domestic/types';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  vendor: z.string().min(1).optional(),
});

// Cùng lý do với app/api/candles/route.ts (F-009/W-102, docs/ops/COMPLETION-PLAN.md): PostgREST trả
// cột `numeric` dạng string — coerce tường minh trước khi dùng, không tin `database.types.ts` mù quáng.
const SupabaseDomesticGoldRowSchema = z.object({
  vendor: z.string(),
  product: z.string(),
  buy: z.coerce.number(),
  sell: z.coerce.number(),
  ts: z.string(),
  source: z.string(),
});

/**
 * Bảng `domestic_gold_prices` lưu time-series (một dòng mỗi lần ingest) — UI chỉ cần giá HIỆN TẠI,
 * nên giữ lại dòng mới nhất cho mỗi (vendor, product). Input đã sắp `ts` giảm dần → dòng gặp đầu tiên
 * của mỗi khóa chính là mới nhất.
 */
function latestByProduct(rows: readonly DomesticGoldPrice[]): DomesticGoldPrice[] {
  const seen = new Map<string, DomesticGoldPrice>();
  for (const row of rows) {
    const key = `${row.vendor}::${row.product}`;
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }
  return [...seen.values()];
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({ vendor: url.searchParams.get('vendor') ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { vendor } = parsed.data;

  const supabase = getSupabaseClient();
  let prices: DomesticGoldPrice[];
  // `source` ở đây là NGUỒN DỮ LIỆU của cả response ('supabase' | 'sample') — khác `source` trong
  // từng dòng giá (tên provider, vd 'btmc'), giữ tên khớp quy ước /api/candles.
  let source: 'supabase' | 'sample';

  if (supabase) {
    let query = supabase
      .from('domestic_gold_prices')
      .select('vendor, product, buy, sell, ts, source')
      .order('ts', { ascending: false })
      .limit(500);
    if (vendor) {
      query = query.eq('vendor', vendor);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rowsParsed = z.array(SupabaseDomesticGoldRowSchema).safeParse(data ?? []);
    if (!rowsParsed.success) {
      return NextResponse.json(
        { error: `Dữ liệu giá vàng trong nước không hợp lệ: ${rowsParsed.error.message}` },
        { status: 500 },
      );
    }
    prices = latestByProduct(rowsParsed.data);
    source = 'supabase';
  } else {
    const sample = vendor
      ? SAMPLE_DOMESTIC_GOLD.filter((p) => p.vendor === vendor)
      : SAMPLE_DOMESTIC_GOLD;
    prices = latestByProduct(sample);
    source = 'sample';
  }

  prices.sort((a, b) => a.product.localeCompare(b.product));
  return NextResponse.json({ source, prices });
}
