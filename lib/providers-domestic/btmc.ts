import { ProviderError } from '@/lib/providers/types';
import {
  DomesticGoldPriceSchema,
  type DomesticGoldPrice,
  type DomesticGoldProvider,
} from '@/lib/providers-domestic/types';

// BTMC (Bảo Tín Minh Châu) trả XML phẳng, mỗi <row> một sản phẩm — định dạng tổng hợp từ nhiều nguồn
// độc lập (xem ADR-0005). CHƯA gọi được response thật trong sandbox này (mạng bị chặn tới btmc.vn) —
// BẮT BUỘC đối chiếu field thật khi deploy (xem supabase/functions/ingest-domestic-gold/README.md)
// trước khi bật pg_cron.
//   <DGPS>
//     <row><n_1>SJC 1L, 10L, 1KG</n_1><k_1>SJC</k_1><h_1>999.9</h_1>
//          <pb_1>97000</pb_1><ps_1>98000</ps_1><pt_1>0</pt_1><d_1>03/07/2026 08:00</d_1></row>
//     ...
//   </DGPS>
// pb_1 = giá mua vào (đồng/chỉ), ps_1 = giá bán ra (đồng/chỉ), d_1 = "dd/MM/yyyy HH:mm" giờ VN (UTC+7).
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
  const [, dd, MM, yyyy, HH, mm] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const utcMs = Date.UTC(Number(yyyy), Number(MM) - 1, Number(dd), Number(HH) - 7, Number(mm));
  return new Date(utcMs).toISOString();
}

/**
 * Parse phòng thủ: một dòng thiếu field/sai định dạng bị BỎ QUA thay vì làm hỏng cả batch (một sản
 * phẩm lỗi không nên chặn các sản phẩm khác cập nhật). Nếu KHÔNG dòng nào hợp lệ → coi là lỗi định
 * dạng thật (vd field đã đổi tên) và ném lỗi rõ ràng, thay vì âm thầm báo "thành công, 0 dòng".
 */
function parseXml(xml: string, providerName: string): DomesticGoldPrice[] {
  const rows = [...xml.matchAll(ROW_RE)].map((m) => m[1] ?? '');
  if (rows.length === 0) {
    throw new ProviderError(providerName, 'Không tìm thấy thẻ <row> nào trong response XML');
  }

  const prices: DomesticGoldPrice[] = [];
  for (const row of rows) {
    const product = extractTag(row, 'n_1');
    const buyRaw = extractTag(row, 'pb_1');
    const sellRaw = extractTag(row, 'ps_1');
    const dateRaw = extractTag(row, 'd_1');
    if (!product || buyRaw === null || sellRaw === null || !dateRaw) continue;

    const ts = vnDateTimeToIsoUtc(dateRaw);
    if (!ts) continue;

    const parsed = DomesticGoldPriceSchema.safeParse({
      vendor: 'btmc',
      product,
      buy: Number(buyRaw),
      sell: Number(sellRaw),
      ts,
      source: providerName,
    });
    if (parsed.success) {
      prices.push(parsed.data);
    }
  }

  if (prices.length === 0) {
    throw new ProviderError(providerName, 'Không có dòng nào hợp lệ trong response XML');
  }
  return prices;
}

export interface BtmcProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class BtmcProvider implements DomesticGoldProvider {
  readonly name = 'btmc';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BtmcProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'http://api.btmc.vn';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchPrices(): Promise<DomesticGoldPrice[]> {
    const url = new URL('/api/BTMCAPI/getpricebtmc', this.baseUrl);
    url.searchParams.set('key', this.apiKey);

    let response: Response;
    try {
      response = await this.fetchImpl(url);
    } catch (err) {
      throw new ProviderError(this.name, 'Gọi API thất bại (mạng)', err);
    }

    if (!response.ok) {
      throw new ProviderError(this.name, `HTTP ${response.status}`);
    }

    const xml = await response.text();
    return parseXml(xml, this.name);
  }
}
