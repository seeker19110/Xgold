// Supabase Edge Function (Deno) — thu thập giá vàng trong nước (BTMC) theo lịch pg_cron.
//
// KHÔNG chạy/kiểm chứng được trong sandbox phát triển hiện tại: không có Deno runtime, mạng bị chặn
// tới api.btmc.vn, VÀ (khác ingest-gold/Twelve Data) định dạng XML dưới đây CHƯA xác nhận bằng
// response thật — chỉ dựa trên tài liệu tổng hợp từ nhiều nguồn độc lập, độ tin cậy trung bình (xem
// ADR-0005). Logic parse mô phỏng theo lib/providers-domestic/btmc.ts (đã unit test bằng fixture ở
// phía Next.js/Node) nhưng viết lại độc lập vì Edge Function không import được path alias '@/...' —
// bản Deno-only, tự chứa.
// BẮT BUỘC test thật (curl trực tiếp URL function) NGAY sau khi deploy, ĐỐI CHIẾU field response thật
// với field giả định dưới đây (n_1/pb_1/ps_1/d_1) — nếu lệch, sửa lại code này trước khi tin tưởng,
// rồi mới bật lịch pg_cron (xem README.md cùng thư mục).
import { createClient } from 'npm:@supabase/supabase-js@2';

const VENDOR = 'btmc';

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

interface DomesticGoldRow {
  vendor: string;
  product: string;
  buy: number;
  sell: number;
  ts: string;
  source: string;
}

/** Parse phòng thủ: dòng thiếu field/vi phạm ràng buộc (sell < buy) bị bỏ qua, không chặn cả batch. */
function parseXml(xml: string): DomesticGoldRow[] {
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

    prices.push({ vendor: VENDOR, product, buy, sell, ts, source: VENDOR });
  }

  return prices;
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
    .insert({ vendor: VENDOR, provider: 'btmc', status: 'running' })
    .select('id')
    .single();

  try {
    const url = new URL('/api/BTMCAPI/getpricebtmc', 'http://api.btmc.vn');
    url.searchParams.set('key', btmcApiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`BTMC HTTP ${res.status}`);
    }

    const xml = await res.text();
    const prices = parseXml(xml);
    if (prices.length === 0) {
      throw new Error(
        'Không có dòng nào hợp lệ trong response XML — field có thể đã đổi, xem ADR-0005',
      );
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
          status: 'success',
          rows_upserted: prices.length,
        })
        .eq('id', run.id as string);
    }

    return new Response(JSON.stringify({ status: 'success', rows: prices.length }), {
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
