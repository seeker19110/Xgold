import { describe, expect, it, vi } from 'vitest';
import { StooqProvider } from '@/lib/providers/stooq';
import { ProviderError } from '@/lib/providers/types';

function textResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
  } as Response;
}

describe('StooqProvider', () => {
  it('parse CSV hợp lệ thành Candle[] (ts = 00:00:00 UTC theo ngày)', async () => {
    const csv = [
      'Date,Open,High,Low,Close,Volume',
      '2021-10-29,1081.86,1115.21,1073.205,1114.0,29918417',
    ].join('\n');
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(csv));
    const provider = new StooqProvider({ fetchImpl });

    const candles = await provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1D' });

    expect(candles).toEqual([
      {
        ts: '2021-10-29T00:00:00.000Z',
        open: 1081.86,
        high: 1115.21,
        low: 1073.205,
        close: 1114.0,
        volume: 29918417,
      },
    ]);
  });

  it('trả mảng rỗng khi Stooq báo "N/D" (không có dữ liệu)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse('N/D'));
    const provider = new StooqProvider({ fetchImpl });

    const candles = await provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1D' });

    expect(candles).toEqual([]);
  });

  it('ném ProviderError khi header CSV sai định dạng', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse('Foo,Bar\n1,2'));
    const provider = new StooqProvider({ fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1D' })).rejects.toThrow(
      ProviderError,
    );
  });

  it('ném ProviderError khi hỏi khung khác 1D (Stooq chỉ hỗ trợ daily)', async () => {
    const fetchImpl = vi.fn();
    const provider = new StooqProvider({ fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1h' })).rejects.toThrow(
      ProviderError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ném ProviderError khi symbol không được hỗ trợ', async () => {
    const fetchImpl = vi.fn();
    const provider = new StooqProvider({ fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'DXY', timeframe: '1D' })).rejects.toThrow(
      ProviderError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ném ProviderError khi HTTP không ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse('', false, 503));
    const provider = new StooqProvider({ fetchImpl });

    await expect(provider.fetchCandles({ symbol: 'XAUUSD', timeframe: '1D' })).rejects.toThrow(
      /HTTP 503/,
    );
  });
});
