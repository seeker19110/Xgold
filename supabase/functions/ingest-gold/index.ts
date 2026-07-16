// Supabase Edge Function (Deno) — thu thập nến mới nhất (mọi mã) từ Twelve Data theo lịch pg_cron.
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

// Mã cần thu thập — giữ đồng bộ THỦ CÔNG với registry `lib/instruments.ts` (Edge Function Deno không
// import được path alias '@/...' của app Next.js). Thêm mã mới: thêm 1 dòng ở đây + seed migration.
const INSTRUMENTS: ReadonlyArray<{ symbol: string; twelveDataSymbol: string }> = [
  { symbol: 'XAUUSD', twelveDataSymbol: 'XAU/USD' },
  { symbol: 'XAGUSD', twelveDataSymbol: 'XAG/USD' },
  // DXY/USDVND: mã Twelve Data suy từ tài liệu công khai, CHƯA gọi API thật xác nhận (xem
  // lib/providers/twelvedata.ts và ADR-0009) — bắt buộc test curl thật trước khi bật pg_cron.
  { symbol: 'DXY', twelveDataSymbol: 'DXY' },
  { symbol: 'USDVND', twelveDataSymbol: 'USD/VND' },
];

// outputsize nhỏ có chủ đích: chạy định kỳ chỉ cần vài nến gần nhất để bắt kịp (đủ bù khi có 1-2
// lần chạy bị lỡ); backfill lịch sử dài dùng `npm run backfill` (scripts/backfill.ts), không phải ở đây.
const JOBS: ReadonlyArray<{
  appTimeframe: '5m' | '1h' | '1D';
  twelveDataInterval: string;
  outputsize: number;
}> = [
  // 5m: outputsize 15 phủ 75 phút — đủ bù trọn khoảng trống giữa 2 lần chạy cron mỗi giờ (chart 5m
  // trễ tối đa ~1h theo lịch hiện tại; muốn sát realtime hơn thì rút ngắn lịch cron, xem README §4).
  { appTimeframe: '5m', twelveDataInterval: '5min', outputsize: 15 },
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

async function fetchTwelveDataCandles(
  twelveDataSymbol: string,
  interval: string,
  outputsize: number,
  apiKey: string,
) {
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', twelveDataSymbol);
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

  const results = [];

  for (const inst of INSTRUMENTS) {
    const { data: instrument, error: instrumentError } = await supabase
      .from('instruments')
      .select('id')
      .eq('symbol', inst.symbol)
      .single();

    if (instrumentError || !instrument) {
      // Một mã thiếu trong CSDL không được chặn các mã khác — ghi lỗi rồi bỏ qua (chạy migration seed).
      results.push({
        symbol: inst.symbol,
        status: 'error',
        error: `Không tìm thấy instrument: ${instrumentError?.message}`,
      });
      continue;
    }

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
          inst.twelveDataSymbol,
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
        results.push({
          symbol: inst.symbol,
          timeframe: job.appTimeframe,
          status: 'success',
          rows: rows.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (run) {
          await supabase
            .from('ingest_runs')
            .update({ finished_at: new Date().toISOString(), status: 'error', error: message })
            .eq('id', run.id as string);
        }
        results.push({
          symbol: inst.symbol,
          timeframe: job.appTimeframe,
          status: 'error',
          error: message,
        });
      }
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
