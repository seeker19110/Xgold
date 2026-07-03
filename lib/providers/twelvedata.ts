import { z } from 'zod';
import { CandleSchema, type Candle } from '@/lib/candles/types';
import type { CandleProvider, FetchCandlesParams } from '@/lib/providers/types';
import { ProviderError } from '@/lib/providers/types';

// Định dạng response theo tài liệu chính thức twelvedata.com/docs (endpoint /time_series),
// đối chiếu lại lần cuối 2026-07-03. CHƯA gọi được API thật trong sandbox (mạng bị chặn — xem
// ADR-0003) nên phần parse dưới đây dựa vào tài liệu + đối chiếu nhiều nguồn, được bảo vệ bằng
// Zod (sai định dạng → lỗi rõ ràng ở ingest_runs thay vì âm thầm hỏng dữ liệu) — cần xác nhận lại
// bằng một lần gọi thật đầu tiên khi deploy (xem PROGRESS.md mục "Nợ kỹ thuật").
const TwelveDataValueSchema = z.object({
  datetime: z.string(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string().optional(),
});

const TwelveDataSuccessSchema = z.object({
  status: z.literal('ok'),
  values: z.array(TwelveDataValueSchema),
});

const TwelveDataErrorSchema = z.object({
  status: z.literal('error'),
  code: z.number().optional(),
  message: z.string(),
});

const TwelveDataResponseSchema = z.union([TwelveDataSuccessSchema, TwelveDataErrorSchema]);

const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'XAU/USD',
};

const INTERVAL_MAP: Record<FetchCandlesParams['timeframe'], string> = {
  '1h': '1h',
  '1D': '1day',
};

/** "2026-07-03 08:00:00" (đã ép timezone=UTC ở query) → "2026-07-03T08:00:00.000Z". */
function toIsoUtc(datetime: string): string {
  const withTime = datetime.length === 10 ? `${datetime} 00:00:00` : datetime;
  return `${withTime.replace(' ', 'T')}.000Z`;
}

export interface TwelveDataProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class TwelveDataProvider implements CandleProvider {
  readonly name = 'twelvedata';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TwelveDataProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.twelvedata.com';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchCandles(params: FetchCandlesParams): Promise<Candle[]> {
    const symbol = SYMBOL_MAP[params.symbol];
    if (!symbol) {
      throw new ProviderError(this.name, `Không hỗ trợ symbol '${params.symbol}'`);
    }

    const url = new URL('/time_series', this.baseUrl);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', INTERVAL_MAP[params.timeframe]);
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('outputsize', String(params.outputsize ?? 500));
    url.searchParams.set('apikey', this.apiKey);
    if (params.startDate) {
      url.searchParams.set('start_date', params.startDate);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url);
    } catch (err) {
      throw new ProviderError(this.name, 'Gọi API thất bại (mạng)', err);
    }

    if (!response.ok) {
      throw new ProviderError(this.name, `HTTP ${response.status}`);
    }

    const json: unknown = await response.json();
    const parsed = TwelveDataResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ProviderError(this.name, `Response không đúng định dạng: ${parsed.error.message}`);
    }

    if (parsed.data.status === 'error') {
      throw new ProviderError(this.name, parsed.data.message);
    }

    return parsed.data.values.map((v) => {
      const candle = CandleSchema.safeParse({
        ts: toIsoUtc(v.datetime),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume !== undefined ? Number(v.volume) : null,
      });
      if (!candle.success) {
        throw new ProviderError(
          this.name,
          `Nến không hợp lệ (${v.datetime}): ${candle.error.message}`,
        );
      }
      return candle.data;
    });
  }
}
