import { CandleSchema, type Candle } from '@/lib/candles/types';
import type { CandleProvider, FetchCandlesParams } from '@/lib/providers/types';
import { ProviderError } from '@/lib/providers/types';

// Stooq (stooq.com/q/d/l/) trả CSV, không cần API key. CHỈ hỗ trợ khung ngày ('1D') — dùng để
// backfill lịch sử dài, không phải nguồn chính (xem ADR-0003). Định dạng CSV đối chiếu nhiều nguồn
// (không tự gọi được API thật trong sandbox — mạng bị chặn, xem PROGRESS.md "Nợ kỹ thuật"):
//   Date,Open,High,Low,Close,Volume
//   2021-10-29,1081.86,1115.21,1073.205,1114.0,29918417
// DXY/USD-VND: KHÔNG thêm vào map này có chủ đích — tìm kiếm không cho kết quả xác thực chắc chắn
// cho ticker Stooq của 2 mã này (có ít nhất 2 khả năng khác nhau cho DXY: "dx.f" hay "usd_i"), và
// mạng sandbox chặn stooq.com nên không gọi thử được để xác nhận (xem ADR-0009). Đoán sai ticker sẽ
// âm thầm lấy nhầm dữ liệu (vd "dx.f" là hợp đồng tương lai, khác chỉ số spot) — rủi ro cao hơn lợi
// ích của việc có Stooq backfill cho 2 mã này. Twelve Data (SYMBOL_MAP ở twelvedata.ts) vẫn phục vụ
// được khung 1h/1D cho cả 2 mã; thiếu Stooq chỉ nghĩa là backfill lịch sử dài (nhiều năm) tạm chưa có.
const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'xauusd',
  XAGUSD: 'xagusd',
};

const EXPECTED_HEADER = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];

function parseCsv(csv: string, providerName: string): Candle[] {
  const lines = csv
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Stooq trả "N/D" (không có dữ liệu) khi symbol không tồn tại/không có nến trong khoảng hỏi.
  if (lines.length === 0 || lines[0] === 'N/D') {
    return [];
  }

  const header = lines[0]?.split(',') ?? [];
  const headerMatches = EXPECTED_HEADER.every((col, i) => header[i] === col);
  if (!headerMatches) {
    throw new ProviderError(providerName, `Header CSV không đúng định dạng: "${lines[0]}"`);
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const [date, open, high, low, close, volume] = cols;
    if (
      !date ||
      open === undefined ||
      high === undefined ||
      low === undefined ||
      close === undefined
    ) {
      throw new ProviderError(providerName, `Dòng CSV thiếu cột: "${line}"`);
    }

    const candle = CandleSchema.safeParse({
      ts: `${date}T00:00:00.000Z`,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: volume ? Number(volume) : null,
    });
    if (!candle.success) {
      throw new ProviderError(providerName, `Nến không hợp lệ (${date}): ${candle.error.message}`);
    }
    return candle.data;
  });
}

export interface StooqProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class StooqProvider implements CandleProvider {
  readonly name = 'stooq';
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: StooqProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://stooq.com';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchCandles(params: FetchCandlesParams): Promise<Candle[]> {
    if (params.timeframe !== '1D') {
      throw new ProviderError(this.name, `Chỉ hỗ trợ khung '1D', nhận '${params.timeframe}'`);
    }
    const symbol = SYMBOL_MAP[params.symbol];
    if (!symbol) {
      throw new ProviderError(this.name, `Không hỗ trợ symbol '${params.symbol}'`);
    }

    const url = new URL('/q/d/l/', this.baseUrl);
    url.searchParams.set('s', symbol);
    url.searchParams.set('i', 'd');
    if (params.startDate) {
      url.searchParams.set('d1', params.startDate.replaceAll('-', ''));
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

    const csv = await response.text();
    return parseCsv(csv, this.name);
  }
}
