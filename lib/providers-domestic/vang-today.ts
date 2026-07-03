import { ProviderError } from '@/lib/providers/types';
import {
  DomesticGoldPriceSchema,
  type DomesticGoldPrice,
  type DomesticGoldProvider,
} from '@/lib/providers-domestic/types';

// vang.today — nguồn DỰ PHÒNG khi BTMC lỗi (ADR-0006), KHÔNG thay BTMC làm nguồn chính. Response JSON
// đã xác nhận SỐNG qua WebFetch trực tiếp ngày 2026-07-04 (không phải suy đoán qua tóm tắt search —
// xem ADR-0006):
//   GET https://www.vang.today/api/prices (không cần key)
//   { "success": true, "timestamp": <unix giây>, "prices": { "<mã>": { "name", "buy", "sell",
//     "change_buy", "change_sell", "currency" }, ... } }
// Whitelist tường minh mã → (vendor, product) dựa đúng 12 mục đã thấy trong response thật — mã lạ bị
// BỎ QUA (parse phòng thủ, giống BtmcProvider), không suy đoán vendor từ chuỗi `name`. XAUUSD bị loại
// vì khác đơn vị tiền (USD) và đã có nguồn riêng (ADR-0003).
const VENDOR_MAP: Readonly<Record<string, string>> = {
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

interface RawEntry {
  name?: unknown;
  buy?: unknown;
  sell?: unknown;
  currency?: unknown;
}

interface RawResponse {
  success?: unknown;
  timestamp?: unknown;
  prices?: unknown;
}

function parseJson(body: string, providerName: string): RawResponse {
  try {
    return JSON.parse(body) as RawResponse;
  } catch (err) {
    throw new ProviderError(providerName, 'Response không phải JSON hợp lệ', err);
  }
}

/**
 * Parse phòng thủ: mã không nằm trong whitelist, thiếu field, hoặc vi phạm ràng buộc (sell < buy) bị
 * BỎ QUA thay vì làm hỏng cả batch. Nếu KHÔNG mã nào hợp lệ → coi là lỗi định dạng thật (field/whitelist
 * đã lệch với response thật) và ném lỗi rõ ràng.
 */
function parsePrices(raw: RawResponse, providerName: string): DomesticGoldPrice[] {
  if (typeof raw.timestamp !== 'number' || typeof raw.prices !== 'object' || raw.prices === null) {
    throw new ProviderError(providerName, 'Response thiếu field "timestamp"/"prices"');
  }
  const ts = new Date(raw.timestamp * 1000).toISOString();

  const prices: DomesticGoldPrice[] = [];
  for (const [code, entry] of Object.entries(raw.prices as Record<string, RawEntry>)) {
    const vendor = VENDOR_MAP[code];
    if (!vendor) continue;
    if (entry.currency !== 'VND') continue;
    if (typeof entry.name !== 'string' || !entry.name) continue;
    if (typeof entry.buy !== 'number' || typeof entry.sell !== 'number') continue;

    const parsed = DomesticGoldPriceSchema.safeParse({
      vendor,
      product: entry.name,
      buy: entry.buy,
      sell: entry.sell,
      ts,
      source: providerName,
    });
    if (parsed.success) {
      prices.push(parsed.data);
    }
  }

  if (prices.length === 0) {
    throw new ProviderError(providerName, 'Không có mã sản phẩm nào khớp whitelist trong response');
  }
  return prices;
}

export interface VangTodayProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class VangTodayProvider implements DomesticGoldProvider {
  readonly name = 'vang-today';
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: VangTodayProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://www.vang.today';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchPrices(): Promise<DomesticGoldPrice[]> {
    const url = new URL('/api/prices', this.baseUrl);

    let response: Response;
    try {
      response = await this.fetchImpl(url);
    } catch (err) {
      throw new ProviderError(this.name, 'Gọi API thất bại (mạng)', err);
    }

    if (!response.ok) {
      throw new ProviderError(this.name, `HTTP ${response.status}`);
    }

    const body = await response.text();
    const raw = parseJson(body, this.name);
    return parsePrices(raw, this.name);
  }
}
