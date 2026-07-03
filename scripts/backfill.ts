/**
 * Backfill lịch sử XAU/USD vào Supabase — chạy TAY một lần (không phải cron).
 * Dùng: npm run backfill
 * Cần biến môi trường: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TWELVEDATA_API_KEY.
 *
 * - Daily ('1D'): Stooq (không cần key) — lấy toàn bộ lịch sử có sẵn.
 * - Hourly ('1h'): Twelve Data — free tier giới hạn outputsize (~5.000 nến/lần), đủ vài tháng gần nhất.
 *
 * KHÔNG chạy được trong sandbox phát triển (mạng bị chặn tới Twelve Data/Stooq — xem ADR-0003);
 * chạy khi đã deploy hoặc từ máy có mạng bình thường, sau khi đã set biến môi trường ở trên.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { StooqProvider, TwelveDataProvider, ProviderError } from '@/lib/providers';
import type { BaseTimeframe, Candle } from '@/lib/candles/types';
import type { Database } from '@/lib/supabase/database.types';

const SYMBOL = 'XAUUSD';
const UPSERT_BATCH_SIZE = 500;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }
  return value;
}

async function upsertCandles(
  supabase: SupabaseClient<Database>,
  instrumentId: string,
  timeframe: BaseTimeframe,
  source: string,
  candles: readonly Candle[],
): Promise<number> {
  let upserted = 0;
  for (let i = 0; i < candles.length; i += UPSERT_BATCH_SIZE) {
    const batch = candles.slice(i, i + UPSERT_BATCH_SIZE).map((c) => ({
      instrument_id: instrumentId,
      timeframe,
      ts: c.ts,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? null,
      source,
    }));
    const { error } = await supabase
      .from('candles')
      .upsert(batch, { onConflict: 'instrument_id,timeframe,ts' });
    if (error) {
      throw new Error(`Upsert candles thất bại: ${error.message}`);
    }
    upserted += batch.length;
    console.log(`  ...upsert ${upserted}/${candles.length}`);
  }
  return upserted;
}

async function runBackfillTask(
  supabase: SupabaseClient<Database>,
  instrumentId: string,
  provider: string,
  timeframe: BaseTimeframe,
  fetchCandles: () => Promise<Candle[]>,
): Promise<void> {
  console.log(`\n== ${provider} / ${timeframe} ==`);
  const { data: run, error: startError } = await supabase
    .from('ingest_runs')
    .insert({ instrument_id: instrumentId, provider, timeframe, status: 'running' })
    .select('id')
    .single();
  if (startError || !run) {
    throw new Error(`Không tạo được ingest_runs: ${startError?.message}`);
  }

  try {
    const candles = await fetchCandles();
    console.log(`  Lấy được ${candles.length} nến từ ${provider}`);
    const rowsUpserted = await upsertCandles(supabase, instrumentId, timeframe, provider, candles);

    await supabase
      .from('ingest_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        rows_upserted: rowsUpserted,
      })
      .eq('id', run.id);
    console.log(`  Xong: ${rowsUpserted} dòng.`);
  } catch (err) {
    const message =
      err instanceof ProviderError || err instanceof Error ? err.message : String(err);
    await supabase
      .from('ingest_runs')
      .update({ finished_at: new Date().toISOString(), status: 'error', error: message })
      .eq('id', run.id);
    console.error(`  LỖI: ${message}`);
  }
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const twelveDataApiKey = requireEnv('TWELVEDATA_API_KEY');

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  const { data: instrument, error } = await supabase
    .from('instruments')
    .select('id')
    .eq('symbol', SYMBOL)
    .single();
  if (error || !instrument) {
    throw new Error(
      `Không tìm thấy instrument '${SYMBOL}' — chạy migration trước. (${error?.message})`,
    );
  }

  const stooq = new StooqProvider();
  const twelveData = new TwelveDataProvider({ apiKey: twelveDataApiKey });

  await runBackfillTask(supabase, instrument.id as string, 'stooq', '1D', () =>
    stooq.fetchCandles({ symbol: SYMBOL, timeframe: '1D' }),
  );

  await runBackfillTask(supabase, instrument.id as string, 'twelvedata', '1h', () =>
    twelveData.fetchCandles({ symbol: SYMBOL, timeframe: '1h', outputsize: 5000 }),
  );

  console.log('\nHoàn tất backfill.');
}

main().catch((err: unknown) => {
  console.error('Backfill thất bại:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
