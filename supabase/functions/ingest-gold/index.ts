// Supabase Edge Function (Deno) — thu thập nến XAU/USD mới nhất từ Twelve Data theo lịch pg_cron.
//
// KHÔNG chạy/kiểm chứng được trong sandbox phát triển hiện tại: không có Deno runtime, và mạng bị
// chặn tới api.twelvedata.com (xem ADR-0003, PROGRESS.md "Nợ kỹ thuật"). Logic parse mô phỏng theo
// `lib/providers/twelvedata.ts` (đã unit test ở phía Next.js/Node) nhưng viết lại độc lập vì Edge
// Function không import được path alias '@/...' của app Next.js — đây là bản Deno-only, tự chứa.
// BẮT BUỘC chạy thử một lần thật (curl trực tiếp URL function) ngay sau khi deploy trước khi tin
// tưởng hoàn toàn, rồi mới bật lịch pg_cron (xem README.md cùng thư mục).
//
// Bảo mật: mặc định Supabase Edge Function yêu cầu JWT hợp lệ (verify_jwt) — pg_net gọi kèm
// service_role key nên không cần thêm cơ chế xác thực riêng ở đây.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

const SYMBOL = 'XAUUSD';
const TWELVEDATA_SYMBOL = 'XAU/USD';

// outputsize nhỏ có chủ đích: chạy định kỳ chỉ cần vài nến gần nhất để bắt kịp (đủ bù khi có 1-2
// lần chạy bị lỡ); backfill lịch sử dài dùng `npm run backfill` (scripts/backfill.ts), không phải ở đây.
const JOBS: ReadonlyArray<{
  appTimeframe: '1h' | '1D';
  twelveDataInterval: string;
  outputsize: number;
}> = [
  { appTimeframe: '1h', twelveDataInterval: '1h', outputsize: 10 },
  { appTimeframe: '1D', twelveDataInterval: '1day', outputsize: 2 },
];

const CandleSchema = z
  .object({
    ts: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nullable().optional(),
  })
  .refine((c) => c.high >= c.low, { message: 'high phải >= low' })
  .refine((c) => c.high >= c.open && c.high >= c.close, { message: 'high phải >= open và close' })
  .refine((c) => c.low <= c.open && c.low <= c.close, { message: 'low phải <= open và close' });

const TwelveDataValueSchema = z.object({
  datetime: z.string(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string().optional(),
});

const TwelveDataResponseSchema = z.union([
  z.object({ status: z.literal('ok'), values: z.array(TwelveDataValueSchema) }),
  z.object({ status: z.literal('error'), message: z.string() }),
]);

function toIsoUtc(datetime: string): string {
  const withTime = datetime.length === 10 ? `${datetime} 00:00:00` : datetime;
  return `${withTime.replace(' ', 'T')}.000Z`;
}

async function fetchTwelveDataCandles(interval: string, outputsize: number, apiKey: string) {
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', TWELVEDATA_SYMBOL);
  url.searchParams.set('interval', interval);
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('outputsize', String(outputsize));
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Twelve Data HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  const parsed = TwelveDataResponseSchema.parse(json);
  if (parsed.status === 'error') {
    throw new Error(parsed.message);
  }

  return parsed.values.map((v) =>
    CandleSchema.parse({
      ts: toIsoUtc(v.datetime),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: v.volume !== undefined ? Number(v.volume) : null,
    }),
  );
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const twelveDataApiKey = Deno.env.get('TWELVEDATA_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !twelveDataApiKey) {
    return new Response(
      JSON.stringify({ error: 'Thiếu biến môi trường (secrets) trên Edge Function' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: instrument, error: instrumentError } = await supabase
    .from('instruments')
    .select('id')
    .eq('symbol', SYMBOL)
    .single();

  if (instrumentError || !instrument) {
    return new Response(
      JSON.stringify({
        error: `Không tìm thấy instrument '${SYMBOL}': ${instrumentError?.message}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const results = [];

  for (const job of JOBS) {
    const { data: run } = await supabase
      .from('ingest_runs')
      .insert({
        instrument_id: instrument.id,
        provider: 'twelvedata',
        timeframe: job.appTimeframe,
        status: 'running',
      })
      .select('id')
      .single();

    try {
      const candles = await fetchTwelveDataCandles(
        job.twelveDataInterval,
        job.outputsize,
        twelveDataApiKey,
      );
      const rows = candles.map((c) => ({
        instrument_id: instrument.id as string,
        timeframe: job.appTimeframe,
        ts: c.ts,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume ?? null,
        source: 'twelvedata',
      }));

      const { error: upsertError } = await supabase
        .from('candles')
        .upsert(rows, { onConflict: 'instrument_id,timeframe,ts' });
      if (upsertError) {
        throw new Error(upsertError.message);
      }

      if (run) {
        await supabase
          .from('ingest_runs')
          .update({
            finished_at: new Date().toISOString(),
            status: 'success',
            rows_upserted: rows.length,
          })
          .eq('id', run.id as string);
      }
      results.push({ timeframe: job.appTimeframe, status: 'success', rows: rows.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (run) {
        await supabase
          .from('ingest_runs')
          .update({ finished_at: new Date().toISOString(), status: 'error', error: message })
          .eq('id', run.id as string);
      }
      results.push({ timeframe: job.appTimeframe, status: 'error', error: message });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
