import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase/client';
import { resample } from '@/lib/candles/resample';
import { TIMEFRAMES, type BaseTimeframe, type Candle, type Timeframe } from '@/lib/candles/types';
import { SAMPLE_XAUUSD_DAILY, SAMPLE_XAUUSD_HOURLY } from '@/lib/fixtures/xauusd';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  symbol: z.string().min(1).default('XAUUSD'),
  timeframe: z.enum(TIMEFRAMES).default('1h'),
});

/** Khung hiển thị nào tính từ khung cơ sở nào (khớp lib/candles/resample.ts). */
function baseTimeframeOf(timeframe: Timeframe): BaseTimeframe {
  return timeframe === '4h' ? '1h' : timeframe === '1W' ? '1D' : timeframe;
}

function sampleBaseCandles(symbol: string, base: BaseTimeframe): Candle[] {
  if (symbol !== 'XAUUSD') return [];
  return base === '1h' ? [...SAMPLE_XAUUSD_HOURLY] : [...SAMPLE_XAUUSD_DAILY];
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
  const base = baseTimeframeOf(timeframe);

  const supabase = getSupabaseClient();

  let baseCandles: Candle[];
  let source: 'supabase' | 'sample';

  if (supabase) {
    const { data: instrument, error: instrumentError } = await supabase
      .from('instruments')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (instrumentError || !instrument) {
      return NextResponse.json({ error: `Không tìm thấy symbol '${symbol}'` }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('candles')
      .select('ts, open, high, low, close, volume')
      .eq('instrument_id', instrument.id)
      .eq('timeframe', base)
      .order('ts', { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    baseCandles = data ?? [];
    source = 'supabase';
  } else {
    baseCandles = sampleBaseCandles(symbol, base);
    source = 'sample';
  }

  const candles = resample(baseCandles, timeframe);
  return NextResponse.json({ symbol, timeframe, source, candles });
}
