import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase/client';
import { resample, SOURCE_TIMEFRAME } from '@/lib/candles/resample';
import { TIMEFRAMES, type BaseTimeframe, type Candle } from '@/lib/candles/types';
import { getInstrumentBySymbol, type Instrument } from '@/lib/instruments';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  symbol: z.string().min(1).default('XAUUSD'),
  timeframe: z.enum(TIMEFRAMES).default('1h'),
});

// PostgREST serialize cột `numeric` của Postgres thành STRING trong JSON (tránh mất độ chính xác
// thập phân) — không phải `number` như `database.types.ts` khai. Coerce tường minh ở ranh giới API
// (CLAUDE.md §3: dữ liệu từ CSDL phải validate lúc chạy) — thiếu bước này thì toán học ở
// lib/indicators/{sma,ema,rsi}.ts (`sum += candle.close`) làm string concat, ra NaN. Xem F-009/W-102
// (docs/ops/COMPLETION-PLAN.md), tái hiện bằng test ở route.test.ts.
const SupabaseCandleRowSchema = z.object({
  ts: z.string(),
  open: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  close: z.coerce.number(),
  volume: z.coerce.number().nullable(),
});

function sampleBaseCandles(instrument: Instrument, base: BaseTimeframe): Candle[] {
  switch (base) {
    case '5m':
      return [...instrument.sample.m5];
    case '1h':
      return [...instrument.sample.hourly];
    case '1D':
      return [...instrument.sample.daily];
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    symbol: url.searchParams.get('symbol') ?? undefined,
    timeframe: url.searchParams.get('timeframe') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbol, timeframe } = parsed.data;

  // Chỉ phục vụ mã có trong registry (nguồn sự thật) — chặn mã lạ NGAY, trước khi chạm CSDL, cho cả
  // chế độ Supabase lẫn dữ liệu mẫu (nhất quán 404 ở mọi nhánh).
  const instrument = getInstrumentBySymbol(symbol);
  if (!instrument) {
    return NextResponse.json({ error: `Không tìm thấy symbol '${symbol}'` }, { status: 404 });
  }

  const base = SOURCE_TIMEFRAME[timeframe];
  const supabase = getSupabaseClient();

  let baseCandles: Candle[];
  let source: 'supabase' | 'sample';

  if (supabase) {
    const { data: dbInstrument, error: instrumentError } = await supabase
      .from('instruments')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (instrumentError || !dbInstrument) {
      return NextResponse.json({ error: `Không tìm thấy symbol '${symbol}'` }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('candles')
      .select('ts, open, high, low, close, volume')
      .eq('instrument_id', dbInstrument.id)
      .eq('timeframe', base)
      .order('ts', { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rowsParsed = z.array(SupabaseCandleRowSchema).safeParse(data ?? []);
    if (!rowsParsed.success) {
      return NextResponse.json(
        { error: `Dữ liệu candles không hợp lệ: ${rowsParsed.error.message}` },
        { status: 500 },
      );
    }
    baseCandles = rowsParsed.data;
    source = 'supabase';
  } else {
    baseCandles = sampleBaseCandles(instrument, base);
    source = 'sample';
  }

  const candles = resample(baseCandles, timeframe);
  return NextResponse.json({ symbol, timeframe, source, candles });
}
