// Supabase Edge Function (Deno) — thu thập giá vàng trong nước theo lịch pg_cron.
// Nguồn CHÍNH: BTMC (api.btmc.vn). Nguồn DỰ PHÒNG: vang.today — chỉ dùng khi BTMC lỗi (ADR-0006).
//
// KHÔNG chạy/kiểm chứng được trong sandbox phát triển hiện tại: không có Deno runtime, mạng bị chặn
// tới api.btmc.vn (BTMC — định dạng XML dưới đây CHƯA xác nhận bằng response thật, xem ADR-0005).
// vang.today ĐÃ xác nhận bằng response thật qua WebFetch trực tiếp ngày 2026-07-04 (ADR-0006), nhưng
// môi trường mạng production Supabase khác sandbox AI — vẫn nên test curl thật khi deploy (README).
// Logic parse của cả 2 mô phỏng theo lib/providers-domestic/{btmc,vang-today}.ts (đã unit test bằng
// fixture ở phía Next.js/Node) nhưng viết lại độc lập vì Edge Function không import được path alias
// '@/...' — bản Deno-only, tự chứa. Sửa logic ở đâu thì sửa cả 2 bản (xem comment đầu mỗi file).
import { createClient } from 'npm:@supabase/supabase-js@2';

interface DomesticGoldRow {
  vendor: string;
  product: string;
  buy: number;
  sell: number;
  ts: string;
  source: string;
}

// ---- BTMC (nguồn chính) ----

const ROW_RE = /<row>([\s\S]*?)<\/row>/gi;
const VN_DATETIME_RE = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;

function extractTag(row: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, 'i').exec(row);
  const value = match?.[1]?.trim();
  return value ? value : null;
}

/** "03/07/2026 08:00" (giờ Asia/Ho_Chi_Minh, UTC+7) → ISO 8601 UTC. */
function vnDateTimeToIsoUtc(vnDateTime: string): string | null {
  const match = VN_DATETIME_RE.exec(vnDateTime);
  if (!match) return null;
  const [, dd, MM, yyyy, HH, mm] = match;
  const utcMs = Date.UTC(Number(yyyy), Number(MM) - 1, Number(dd), Number(HH) - 7, Number(mm));
  return new Date(utcMs).toISOString();
}

/** Parse phòng thủ: dòng thiếu field/vi phạm ràng buộc (sell < buy) bị bỏ qua, không chặn cả batch. */
function parseBtmcXml(xml: string): DomesticGoldRow[] {
  const rows = [...xml.matchAll(ROW_RE)].map((m) => m[1] ?? '');
  const prices: DomesticGoldRow[] = [];

  for (const row of rows) {
    const product = extractTag(row, 'n_1');
    const buyRaw = extractTag(row, 'pb_1');
    const sellRaw = extractTag(row, 'ps_1');
    const dateRaw = extractTag(row, 'd_1');
    if (!product || buyRaw === null || sellRaw === null || !dateRaw) continue;

    const ts = vnDateTimeToIsoUtc(dateRaw);
    if (!ts) continue;

    const buy = Number(buyRaw);
    const sell = Number(sellRaw);
    if (!(buy > 0) || !(sell >= buy)) continue;

    prices.push({ vendor: 'btmc', product, buy, sell, ts, source: 'btmc' });
  }

  return prices;
}

async function fetchBtmc(apiKey: string): Promise<DomesticGoldRow[]> {
  const url = new URL('/api/BTMCAPI/getpricebtmc', 'http://api.btmc.vn');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`BTMC HTTP ${res.status}`);
  }
  const xml = await res.text();
  const prices = parseBtmcXml(xml);
  if (prices.length === 0) {
    throw new Error(
      'BTMC: không có dòng nào hợp lệ trong response XML — field có thể đã đổi (ADR-0005)',
    );
  }
  return prices;
}

// ---- vang.today (nguồn dự phòng — ADR-0006) ----

// Whitelist tường minh mã → vendor, ĐỒNG BỘ với lib/providers-domestic/vang-today.ts — xem file đó
// cho lý do không suy đoán vendor từ chuỗi `name`. XAUUSD bị loại (khác đơn vị tiền, nguồn riêng).
const VANG_TODAY_VENDOR_MAP: Readonly<Record<string, string>> = {
  SJL1L10: 'sjc',
  SJ9999: 'sjc',
  DOHNL: 'doji',
  DOHCML: 'doji',
  DOJINHTV: 'doji',
  PQHN24NTT: 'pnj',
  PQHNVM: 'pnj',
  VIETTINMSJC: 'vietinbank',
  VNGSJC: 'vn-gold',
  BTSJC: 'bao-tin',
  BT9999NTT: 'bao-tin',
};

interface VangTodayEntry {
  name?: unknown;
  buy?: unknown;
  sell?: unknown;
  currency?: unknown;
}

function parseVangToday(body: string): DomesticGoldRow[] {
  let raw: { timestamp?: unknown; prices?: unknown };
  try {
    raw = JSON.parse(body) as { timestamp?: unknown; prices?: unknown };
  } catch {
    throw new Error('vang.today: response không phải JSON hợp lệ');
  }
  if (typeof raw.timestamp !== 'number' || typeof raw.prices !== 'object' || raw.prices === null) {
    throw new Error('vang.today: response thiếu field "timestamp"/"prices"');
  }
  const ts = new Date(raw.timestamp * 1000).toISOString();

  const prices: DomesticGoldRow[] = [];
  for (const [code, entry] of Object.entries(raw.prices as Record<string, VangTodayEntry>)) {
    const vendor = VANG_TODAY_VENDOR_MAP[code];
    if (!vendor) continue;
    if (entry.currency !== 'VND') continue;
    if (typeof entry.name !== 'string' || !entry.name) continue;
    if (typeof entry.buy !== 'number' || typeof entry.sell !== 'number') continue;
    if (!(entry.buy > 0) || !(entry.sell >= entry.buy)) continue;

    prices.push({
      vendor,
      product: entry.name,
      buy: entry.buy,
      sell: entry.sell,
      ts,
      source: 'vang-today',
    });
  }

  if (prices.length === 0) {
    throw new Error('vang.today: không có mã nào khớp whitelist trong response');
  }
  return prices;
}

async function fetchVangToday(): Promise<DomesticGoldRow[]> {
  const res = await fetch('https://www.vang.today/api/prices');
  if (!res.ok) {
    throw new Error(`vang.today HTTP ${res.status}`);
  }
  return parseVangToday(await res.text());
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const btmcApiKey = Deno.env.get('BTMC_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !btmcApiKey) {
    return new Response(
      JSON.stringify({ error: 'Thiếu biến môi trường (secrets) trên Edge Function' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: run } = await supabase
    .from('domestic_gold_ingest_runs')
    .insert({ vendor: 'domestic-gold', provider: 'btmc', status: 'running' })
    .select('id')
    .single();

  let prices: DomesticGoldRow[];
  let provider: string;
  try {
    try {
      prices = await fetchBtmc(btmcApiKey);
      provider = 'btmc';
    } catch (btmcErr) {
      // BTMC lỗi → thử nguồn dự phòng (ADR-0006) thay vì thất bại ngay.
      try {
        prices = await fetchVangToday();
        provider = 'vang-today';
      } catch (vangTodayErr) {
        const btmcMessage = btmcErr instanceof Error ? btmcErr.message : String(btmcErr);
        const vangTodayMessage =
          vangTodayErr instanceof Error ? vangTodayErr.message : String(vangTodayErr);
        throw new Error(
          `Cả 2 nguồn đều lỗi — BTMC: ${btmcMessage} | vang.today: ${vangTodayMessage}`,
        );
      }
    }

    const { error: upsertError } = await supabase
      .from('domestic_gold_prices')
      .upsert(prices, { onConflict: 'vendor,product,ts' });
    if (upsertError) {
      throw new Error(upsertError.message);
    }

    if (run) {
      await supabase
        .from('domestic_gold_ingest_runs')
        .update({
          finished_at: new Date().toISOString(),
          provider,
          status: 'success',
          rows_upserted: prices.length,
        })
        .eq('id', run.id as string);
    }

    return new Response(JSON.stringify({ status: 'success', provider, rows: prices.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (run) {
      await supabase
        .from('domestic_gold_ingest_runs')
        .update({ finished_at: new Date().toISOString(), status: 'error', error: message })
        .eq('id', run.id as string);
    }
    return new Response(JSON.stringify({ status: 'error', error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
