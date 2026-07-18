import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTS,
  filterInstruments,
  getInstrumentBySlug,
  getInstrumentBySymbol,
  isSupportedSymbol,
} from '@/lib/instruments';

describe('registry mã (lib/instruments)', () => {
  it('có ít nhất XAU/USD, XAG/USD, DXY và USD/VND', () => {
    const symbols = INSTRUMENTS.map((i) => i.symbol);
    expect(symbols).toContain('XAUUSD');
    expect(symbols).toContain('XAGUSD');
    expect(symbols).toContain('DXY');
    expect(symbols).toContain('USDVND');
  });

  it('symbol và slug đều duy nhất', () => {
    const symbols = INSTRUMENTS.map((i) => i.symbol);
    const slugs = INSTRUMENTS.map((i) => i.slug);
    expect(new Set(symbols).size).toBe(symbols.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('slug luôn là chữ thường (URL sạch)', () => {
    for (const i of INSTRUMENTS) {
      expect(i.slug).toBe(i.slug.toLowerCase());
    }
  });

  it('getInstrumentBySymbol tra đúng, mã lạ trả undefined', () => {
    expect(getInstrumentBySymbol('XAUUSD')?.slug).toBe('xauusd');
    expect(getInstrumentBySymbol('XAGUSD')?.label).toBe('XAG/USD');
    expect(getInstrumentBySymbol('NOPE')).toBeUndefined();
  });

  it('getInstrumentBySlug không phân biệt hoa/thường, slug lạ trả undefined', () => {
    expect(getInstrumentBySlug('xauusd')?.symbol).toBe('XAUUSD');
    expect(getInstrumentBySlug('XAGUSD')?.symbol).toBe('XAGUSD');
    expect(getInstrumentBySlug('unknown')).toBeUndefined();
  });

  it('isSupportedSymbol đúng cho mã hỗ trợ và mã lạ', () => {
    expect(isSupportedSymbol('XAUUSD')).toBe(true);
    expect(isSupportedSymbol('XAGUSD')).toBe(true);
    expect(isSupportedSymbol('DXY')).toBe(true);
    expect(isSupportedSymbol('USDVND')).toBe(true);
    expect(isSupportedSymbol('xauusd')).toBe(false); // phân biệt hoa/thường: symbol là chữ hoa
    expect(isSupportedSymbol('NOPE')).toBe(false);
  });

  it('mỗi mã có bộ dữ liệu mẫu daily + hourly không rỗng', () => {
    for (const i of INSTRUMENTS) {
      expect(i.sample.daily.length).toBeGreaterThan(0);
      expect(i.sample.hourly.length).toBeGreaterThan(0);
    }
  });

  describe('filterInstruments (W-508 — symbol search)', () => {
    it('query rỗng hoặc chỉ khoảng trắng trả toàn bộ registry', () => {
      expect(filterInstruments('')).toEqual(INSTRUMENTS);
      expect(filterInstruments('   ')).toEqual(INSTRUMENTS);
    });

    it('lọc theo symbol không phân biệt hoa/thường', () => {
      expect(filterInstruments('xauusd').map((i) => i.symbol)).toEqual(['XAUUSD']);
      expect(filterInstruments('XAGUSD').map((i) => i.symbol)).toEqual(['XAGUSD']);
    });

    it('lọc theo label (vd "XAU/USD") không phân biệt hoa/thường', () => {
      expect(filterInstruments('xau/usd').map((i) => i.symbol)).toEqual(['XAUUSD']);
    });

    it('lọc theo name (vd "vàng") không phân biệt hoa/thường', () => {
      expect(filterInstruments('VÀNG').map((i) => i.symbol)).toEqual(['XAUUSD']);
    });

    it('chuỗi con khớp một phần (vd "usd") trả nhiều mã', () => {
      const results = filterInstruments('usd').map((i) => i.symbol);
      expect(results).toContain('XAUUSD');
      expect(results).toContain('XAGUSD');
      expect(results).toContain('USDVND');
    });

    it('không khớp mã nào trả mảng rỗng', () => {
      expect(filterInstruments('khong-ton-tai')).toEqual([]);
    });
  });
});
