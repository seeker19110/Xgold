import { describe, expect, it, vi } from 'vitest';
import { TwelveDataProvider } from '@/lib/providers/twelvedata';
import { ProviderError } from '@/lib/providers/types';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('TwelveDataProvider', () => {
  it('parse response thành công thành Candle[] (chuỗi → số, datetime UTC → ISO)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'ok',
        values: [
          {
            datetime: '2026-07-03 08:00:00',
            open: '3350.10',
            high: '3355.50',
            low: '3348.00',
            close: '3352.25',
            volume: '1200',
          },
          {
            datetime: '2026-07-03 07:00:00',
            open: '3348.00',
            high: '3351.00',
            low: '3346.50',
            close: '3350.10',
          },
        ],
      }),
    );
    const provider = new TwelveDataProvider({ apiKey: 'test-key', fetchImpl });

    const candles = await provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1h' });

    expect(candles).toHaveLength(2);
    expect(candles[0]).toEqual({
      ts: '2026-07-03T08:00:00.000Z',
      open: 3350.1,
      high: 3355.5,
      low: 3348.0,
      close: 3352.25,
      volume: 1200,
    });
    expect(candles[1]?.volume).toBeNull();
  });

  it('gửi đúng query: symbol map sang XAU/USD, interval 1day cho khung 1D, timezone=UTC', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', values: [] }));
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1D', startDate: '2020-01-01' });

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as URL;
    expect(calledUrl.searchParams.get('symbol')).toBe('XAU/USD');
    expect(calledUrl.searchParams.get('interval')).toBe('1day');
    expect(calledUrl.searchParams.get('timezone')).toBe('UTC');
    expect(calledUrl.searchParams.get('start_date')).toBe('2020-01-01');
    expect(calledUrl.searchParams.get('apikey')).toBe('k');
  });

  it('map XAGUSD (bạc) sang symbol Twelve Data "XAG/USD"', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', values: [] }));
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await provider.fetchCandles({ symbol: 'XAGUSD', timeframe: '1h' });

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as URL;
    expect(calledUrl.searchParams.get('symbol')).toBe('XAG/USD');
  });

  it('map DXY sang symbol Twelve Data "DXY"', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', values: [] }));
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await provider.fetchCandles({ symbol: 'DXY', timeframe: '1h' });

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as URL;
    expect(calledUrl.searchParams.get('symbol')).toBe('DXY');
  });

  it('map USDVND sang symbol Twelve Data "USD/VND"', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok', values: [] }));
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await provider.fetchCandles({ symbol: 'USDVND', timeframe: '1h' });

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as URL;
    expect(calledUrl.searchParams.get('symbol')).toBe('USD/VND');
  });

  it('ném ProviderError khi provider trả status=error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'error', code: 400, message: 'invalid apikey' }));
    const provider = new TwelveDataProvider({ apiKey: 'bad', fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1h' })).rejects.toThrow(
      ProviderError,
    );
  });

  it('ném ProviderError khi HTTP không ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1h' })).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it('ném ProviderError khi symbol không được hỗ trợ, không gọi fetch', async () => {
    const fetchImpl = vi.fn();
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'NOPE', timeframe: '1h' })).rejects.toThrow(
      ProviderError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ném ProviderError khi response sai định dạng (thiếu values)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1h' })).rejects.toThrow(
      ProviderError,
    );
  });

  it('ném ProviderError khi nến vi phạm ràng buộc OHLC (high < low)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'ok',
        values: [
          { datetime: '2026-07-03 08:00:00', open: '100', high: '90', low: '95', close: '92' },
        ],
      }),
    );
    const provider = new TwelveDataProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1h' })).rejects.toThrow(
      ProviderError,
    );
  });
});
