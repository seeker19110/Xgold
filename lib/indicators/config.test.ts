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

  it('id trùng nhau trong maLines (URL bị sửa tay) → trả null (F-006)', () => {
    const bad = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [
            { id: 'ma-1', type: 'SMA', period: 20, color: '#fff', visible: true },
            { id: 'ma-1', type: 'EMA', period: 50, color: '#000', visible: true },
          ],
          rsiLines: [],
        }),
      ),
    );
    expect(decodeChartConfig(bad)).toBeNull();
  });

  it('cấu hình CŨ (trước Đợt 6/7, không có macd/bollinger/analysis) vẫn giải mã được với default', () => {
    const legacy = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [{ id: 'ma-20', type: 'SMA', period: 20, color: '#facc15', visible: true }],
          rsiLines: [{ id: 'rsi-14', period: 14, color: '#a78bfa', visible: true }],
        }),
      ),
    );
    const decoded = decodeChartConfig(legacy);
    expect(decoded).not.toBeNull();
    expect(decoded?.volume).toEqual(DEFAULT_CHART_CONFIG.volume);
    expect(decoded?.macd).toEqual(DEFAULT_CHART_CONFIG.macd);
    expect(decoded?.bollinger).toEqual(DEFAULT_CHART_CONFIG.bollinger);
    expect(decoded?.ichimoku).toEqual(DEFAULT_CHART_CONFIG.ichimoku);
    expect(decoded?.analysis).toEqual(DEFAULT_CHART_CONFIG.analysis);
  });

  it('cấu hình CŨ (trước Đợt 14, không có priceScaleMode) vẫn giải mã được với default normal (W-503)', () => {
    const legacy = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [{ id: 'ma-20', type: 'SMA', period: 20, color: '#facc15', visible: true }],
          rsiLines: [{ id: 'rsi-14', period: 14, color: '#a78bfa', visible: true }],
        }),
      ),
    );
    const decoded = decodeChartConfig(legacy);
    expect(decoded).not.toBeNull();
    expect(decoded?.priceScaleMode).toBe('normal');
  });

  it('priceScaleMode "logarithmic" round-trip đúng (W-503)', () => {
    const config = { ...DEFAULT_CHART_CONFIG, priceScaleMode: 'logarithmic' as const };
    const encoded = encodeChartConfig(config);
    const decoded = decodeChartConfig(encoded);
    expect(decoded).toEqual(config);
  });

  it('priceScaleMode giá trị lạ trong URL bị sửa tay → trả null', () => {
    const bad = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [],
          rsiLines: [],
          priceScaleMode: 'invalid-mode',
        }),
      ),
    );
    expect(decodeChartConfig(bad)).toBeNull();
  });

  it('cấu hình CŨ (không có chartType) vẫn giải mã được với default candles (W-502)', () => {
    const legacy = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [{ id: 'ma-20', type: 'SMA', period: 20, color: '#facc15', visible: true }],
          rsiLines: [{ id: 'rsi-14', period: 14, color: '#a78bfa', visible: true }],
        }),
      ),
    );
    const decoded = decodeChartConfig(legacy);
    expect(decoded).not.toBeNull();
    expect(decoded?.chartType).toBe('candles');
  });

  it.each(['candles', 'heikinAshi', 'bar', 'line', 'area'] as const)(
    'chartType "%s" round-trip đúng (W-502)',
    (chartType) => {
      const config = { ...DEFAULT_CHART_CONFIG, chartType };
      const decoded = decodeChartConfig(encodeChartConfig(config));
      expect(decoded).toEqual(config);
    },
  );

  it('chartType giá trị lạ trong URL bị sửa tay → trả null (W-502)', () => {
    const bad = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [],
          rsiLines: [],
          chartType: 'renko',
        }),
      ),
    );
    expect(decodeChartConfig(bad)).toBeNull();
  });

  it('MACD fast >= slow trong URL bị sửa tay → trả null', () => {
    const bad = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [],
          rsiLines: [],
          macd: { visible: true, fast: 26, slow: 12, signal: 9 },
        }),
      ),
    );
    expect(decodeChartConfig(bad)).toBeNull();
  });

  it('id trùng nhau trong rsiLines (URL bị sửa tay) → trả null (F-006)', () => {
    const bad = encodeURIComponent(
      btoa(
        JSON.stringify({
          maLines: [],
          rsiLines: [
            { id: 'rsi-1', period: 14, color: '#fff', visible: true },
            { id: 'rsi-1', period: 21, color: '#000', visible: true },
          ],
        }),
      ),
    );
    expect(decodeChartConfig(bad)).toBeNull();
  });
});
