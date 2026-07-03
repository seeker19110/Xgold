import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHART_CONFIG,
  decodeChartConfig,
  encodeChartConfig,
} from '@/lib/indicators/config';

describe('encodeChartConfig / decodeChartConfig', () => {
  it('mã hóa rồi giải mã trả đúng cấu hình ban đầu (round-trip)', () => {
    const encoded = encodeChartConfig(DEFAULT_CHART_CONFIG);
    const decoded = decodeChartConfig(encoded);
    expect(decoded).toEqual(DEFAULT_CHART_CONFIG);
  });

  it('mã hóa an toàn để đặt vào URL query string (không còn ký tự đặc biệt)', () => {
    const encoded = encodeChartConfig(DEFAULT_CHART_CONFIG);
    const url = new URL('http://localhost/chart/xauusd');
    url.searchParams.set('cfg', encoded);
    expect(decodeChartConfig(url.searchParams.get('cfg')!)).toEqual(DEFAULT_CHART_CONFIG);
  });

  it('chuỗi rác/bị sửa tay → trả null thay vì ném lỗi', () => {
    expect(decodeChartConfig('không-phải-base64-hợp-lệ!!!')).toBeNull();
  });

  it('JSON hợp lệ nhưng sai shape (thiếu rsiLines) → trả null', () => {
    const badButValidBase64 = encodeURIComponent(btoa(JSON.stringify({ maLines: [] })));
    expect(decodeChartConfig(badButValidBase64)).toBeNull();
  });

  it('period âm hoặc 0 bị Zod từ chối', () => {
    const bad = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [{ id: 'x', type: 'SMA', period: 0, color: '#fff', visible: true }],
          rsiLines: [],
        }),
      ),
    );
    expect(decodeChartConfig(bad)).toBeNull();
  });
});
