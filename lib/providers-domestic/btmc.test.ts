import { describe, expect, it, vi } from 'vitest';
import { BtmcProvider } from '@/lib/providers-domestic/btmc';
import { ProviderError } from '@/lib/providers/types';

function textResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
  } as Response;
}

const VALID_XML = `<?xml version="1.0" encoding="utf-8"?>
<DGPS>
<row><n_1>SJC 1L, 10L, 1KG</n_1><k_1>SJC</k_1><h_1>999.9</h_1><pb_1>97000000</pb_1><ps_1>98000000</ps_1><pt_1>0</pt_1><d_1>03/07/2026 08:00</d_1></row>
<row><n_1>Nhẫn Trơn (999.9)</n_1><k_1>9999</k_1><h_1>999.9</h_1><pb_1>96500000</pb_1><ps_1>97500000</ps_1><pt_1>0</pt_1><d_1>03/07/2026 03:00</d_1></row>
</DGPS>`;

describe('BtmcProvider', () => {
  it('parse XML thành công thành DomesticGoldPrice[] (giờ VN → UTC, chuỗi → số)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(VALID_XML));
    const provider = new BtmcProvider({ apiKey: 'test-key', fetchImpl });

    const prices = await provider.fetchPrices();

    expect(prices).toHaveLength(2);
    // "03/07/2026 08:00" giờ VN (UTC+7) → 08:00 - 7h = 01:00 UTC cùng ngày.
    expect(prices[0]).toEqual({
      vendor: 'btmc',
      product: 'SJC 1L, 10L, 1KG',
      buy: 97000000,
      sell: 98000000,
      ts: '2026-07-03T01:00:00.000Z',
      source: 'btmc',
    });
  });

  it('vượt ranh giới ngày: "03/07/2026 03:00" giờ VN (UTC+7) → 2026-07-02T20:00:00.000Z', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(VALID_XML));
    const provider = new BtmcProvider({ apiKey: 'test-key', fetchImpl });

    const prices = await provider.fetchPrices();

    expect(prices[1]?.ts).toBe('2026-07-02T20:00:00.000Z');
  });

  it('gửi đúng query: key vào URL, baseUrl tùy chỉnh', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(VALID_XML));
    const provider = new BtmcProvider({
      apiKey: 'my-key',
      baseUrl: 'https://fake.test',
      fetchImpl,
    });

    await provider.fetchPrices();

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as URL;
    expect(calledUrl.origin).toBe('https://fake.test');
    expect(calledUrl.pathname).toBe('/api/BTMCAPI/getpricebtmc');
    expect(calledUrl.searchParams.get('key')).toBe('my-key');
  });

  it('bỏ qua dòng thiếu field, vẫn giữ lại các dòng hợp lệ khác', async () => {
    const xml = `<DGPS>
<row><n_1>Sản phẩm lỗi</n_1><k_1>SJC</k_1><h_1>999.9</h_1><pt_1>0</pt_1><d_1>03/07/2026 08:00</d_1></row>
<row><n_1>Sản phẩm OK</n_1><k_1>SJC</k_1><h_1>999.9</h_1><pb_1>97000000</pb_1><ps_1>98000000</ps_1><pt_1>0</pt_1><d_1>03/07/2026 08:00</d_1></row>
</DGPS>`;
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(xml));
    const provider = new BtmcProvider({ apiKey: 'k', fetchImpl });

    const prices = await provider.fetchPrices();

    expect(prices).toHaveLength(1);
    expect(prices[0]?.product).toBe('Sản phẩm OK');
  });

  it('bỏ qua dòng vi phạm ràng buộc (sell < buy)', async () => {
    const xml = `<DGPS>
<row><n_1>Giá ngược</n_1><pb_1>98000000</pb_1><ps_1>97000000</ps_1><d_1>03/07/2026 08:00</d_1></row>
</DGPS>`;
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(xml));
    const provider = new BtmcProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });

  it('ném ProviderError khi không có thẻ <row> nào', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse('<DGPS></DGPS>'));
    const provider = new BtmcProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });

  it('ném ProviderError khi HTTP không ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse('', false, 500));
    const provider = new BtmcProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(/HTTP 500/);
  });

  it('ném ProviderError khi gọi fetch thất bại (mạng)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const provider = new BtmcProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchPrices()).rejects.toThrow(ProviderError);
  });
});
