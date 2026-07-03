import { describe, expect, it, vi } from 'vitest';
import { VangTodayProvider } from '@/lib/providers-domestic/vang-today';
import { ProviderError } from '@/lib/providers/types';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

// Fixture rút gọn từ response THẬT đã xác nhận sống ngày 2026-07-04 (ADR-0006) — giữ đúng field
// name/buy/sell/currency, bỏ bớt vài mục để test gọn.
const VALID_RESPONSE = {
  success: true,
  timestamp: 1783099805,
  prices: {
    SJL1L10: {
      name: 'SJC 9999',
      buy: 148400000,
      sell: 151400000,
      change_buy: 0,
      change_sell: 0,
      currency: 'VND',
    },
    DOHNL: {
      name: 'DOJI Hanoi',
      buy: 148400000,
      sell: 151400000,
      change_buy: 0,
      change_sell: 0,
      currency: 'VND',
    },
    XAUUSD: {
      name: 'World Gold (XAU/USD)',
      buy: 4176.1,
      sell: 0,
      change_buy: 1,
      change_sell: 0,
      currency: 'USD',
    },
  },
};

describe('VangTodayProvider', () => {
  it('parse response thành DomesticGoldPrice[], gán đúng vendor theo whitelist, loại XAUUSD', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(VALID_RESPONSE));
    const provider = new VangTodayProvider({ fetchImpl });

    const prices = await provider.fetchPrices();

    expect(prices).toHaveLength(2);
    expect(prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          vendor: 'sjc',
          product: 'SJC 9999',
          buy: 148400000,
          sell: 151400000,
        }),
        expect.objectContaining({ vendor: 'doji', product: 'DOJI Hanoi' }),
      ]),
    );
    expect(prices.every((p) => p.source === 'vang-today')).toBe(true);
    expect(prices.some((p) => p.product === 'World Gold (XAU/USD)')).toBe(false);
  });

  it('timestamp (unix giây) → ts ISO UTC dùng chung cho cả batch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(VALID_RESPONSE));
    const provider = new VangTodayProvider({ fetchImpl });

    const prices = await provider.fetchPrices();

    expect(prices[0]?.ts).toBe(new Date(1783099805 * 1000).toISOString());
    expect(new Set(prices.map((p) => p.ts)).size).toBe(1);
  });

  it('gọi đúng URL (baseUrl tùy chỉnh, không cần key)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(VALID_RESPONSE));
    const provider = new VangTodayProvider({ baseUrl: 'https://fake.test', fetchImpl });

    await provider.fetchPrices();

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as URL;
    expect(calledUrl.origin).toBe('https://fake.test');
    expect(calledUrl.pathname).toBe('/api/prices');
    expect(calledUrl.search).toBe('');
  });

  it('bỏ qua mã không nằm trong whitelist, vẫn giữ mã hợp lệ khác', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        timestamp: 1783099805,
        prices: {
          UNKNOWN_CODE: { name: 'Something new', buy: 100, sell: 200, currency: 'VND' },
          SJL1L10: VALID_RESPONSE.prices.SJL1L10,
        },
      }),
    );
    const provider = new VangTodayProvider({ fetchImpl });

    const prices = await provider.fetchPrices();

    expect(prices).toHaveLength(1);
    expect(prices[0]?.product).toBe('SJC 9999');
  });

  it('bỏ qua mã vi phạm ràng buộc (sell < buy)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        timestamp: 1783099805,
        prices: {
          SJL1L10: { name: 'Giá ngược', buy: 200, sell: 100, currency: 'VND' },
        },
      }),
    );
    const provider = new VangTodayProvider({ fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });

  it('ném ProviderError khi thiếu field timestamp/prices', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const provider = new VangTodayProvider({ fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });

  it('ném ProviderError khi response không phải JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not json'),
    } as Response);
    const provider = new VangTodayProvider({ fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });

  it('ném ProviderError khi HTTP không ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
    const provider = new VangTodayProvider({ fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(/HTTP 500/);
  });

  it('ném ProviderError khi gọi fetch thất bại (mạng)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const provider = new VangTodayProvider({ fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });

  it('ném ProviderError khi không mã nào khớp whitelist', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        timestamp: 1783099805,
        prices: { XAUUSD: VALID_RESPONSE.prices.XAUUSD },
      }),
    );
    const provider = new VangTodayProvider({ fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });
});
