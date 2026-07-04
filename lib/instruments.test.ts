import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTS,
  getInstrumentBySlug,
  getInstrumentBySymbol,
  isSupportedSymbol,
} from '@/lib/instruments';

describe('registry mã (lib/instruments)', () => {
  it('có ít nhất XAU/USD và XAG/USD', () => {
    const symbols = INSTRUMENTS.map((i) => i.symbol);
    expect(symbols).toContain('XAUUSD');
    expect(symbols).toContain('XAGUSD');
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
    expect(isSupportedSymbol('xauusd')).toBe(false); // phân biệt hoa/thường: symbol là chữ hoa
    expect(isSupportedSymbol('DXY')).toBe(false);
  });

  it('mỗi mã có bộ dữ liệu mẫu daily + hourly không rỗng', () => {
    for (const i of INSTRUMENTS) {
      expect(i.sample.daily.length).toBeGreaterThan(0);
      expect(i.sample.hourly.length).toBeGreaterThan(0);
    }
  });
});
