import type { Candle } from '@/lib/candles/types';
import { SAMPLE_XAUUSD_DAILY, SAMPLE_XAUUSD_HOURLY } from '@/lib/fixtures/xauusd';
import { SAMPLE_XAGUSD_DAILY, SAMPLE_XAGUSD_HOURLY } from '@/lib/fixtures/xagusd';
import { SAMPLE_DXY_DAILY, SAMPLE_DXY_HOURLY } from '@/lib/fixtures/dxy';
import { SAMPLE_USDVND_DAILY, SAMPLE_USDVND_HOURLY } from '@/lib/fixtures/usdvnd';

/**
 * Registry mã (instrument) — NGUỒN SỰ THẬT DUY NHẤT cho danh sách mã Xgold theo dõi. Mọi nơi cần
 * biết "app hỗ trợ những mã nào" (route động `/chart/[symbol]`, trang chủ, API `/api/candles`, seed
 * migration, backfill, ingestion) đọc từ đây thay vì hard-code từng chỗ — thêm mã mới = thêm 1 mục.
 *
 * Slug (URL) tách khỏi symbol (CSDL) có chủ đích: URL đẹp chữ thường (`/chart/xauusd`), CSDL giữ mã
 * chuẩn chữ hoa (`XAUUSD`) khớp provider SYMBOL_MAP + cột `instruments.symbol`.
 */
export interface Instrument {
  /** Mã chuẩn hoá lưu trong CSDL (cột `instruments.symbol`) + khoá provider SYMBOL_MAP, vd 'XAUUSD'. */
  symbol: string;
  /** Slug URL chữ thường, vd 'xauusd' → `/chart/xauusd`. */
  slug: string;
  /** Nhãn ngắn hiển thị (tiêu đề, nút chuyển mã), vd 'XAU/USD'. */
  label: string;
  /** Tên đầy đủ (trang chủ, metadata), vd 'Vàng thế giới (XAU/USD)'. */
  name: string;
  /** Cụm mô tả cho aria-label chart, vd 'giá vàng XAU/USD' (ghép vào "Chart nến {chartLabel} …"). */
  chartLabel: string;
  /** Loại tài sản (khớp cột `instruments.type`). */
  type: 'commodity' | 'index' | 'forex';
  /** Tiền tệ báo giá (khớp cột `instruments.currency`). Với DXY (chỉ số, không có đơn vị tiền tệ
   * thật) dùng 'USD' theo quy ước — chỉ số này đo sức mạnh đồng đô la. */
  currency: 'USD' | 'VND';
  /** Dữ liệu MẪU (chưa có Supabase / test) — daily cho 1D/1W, hourly cho 1h/4h. */
  sample: { daily: readonly Candle[]; hourly: readonly Candle[] };
}

export const INSTRUMENTS: readonly Instrument[] = [
  {
    symbol: 'XAUUSD',
    slug: 'xauusd',
    label: 'XAU/USD',
    name: 'Vàng thế giới (XAU/USD)',
    chartLabel: 'giá vàng XAU/USD',
    type: 'commodity',
    currency: 'USD',
    sample: { daily: SAMPLE_XAUUSD_DAILY, hourly: SAMPLE_XAUUSD_HOURLY },
  },
  {
    symbol: 'XAGUSD',
    slug: 'xagusd',
    label: 'XAG/USD',
    name: 'Bạc thế giới (XAG/USD)',
    chartLabel: 'giá bạc XAG/USD',
    type: 'commodity',
    currency: 'USD',
    sample: { daily: SAMPLE_XAGUSD_DAILY, hourly: SAMPLE_XAGUSD_HOURLY },
  },
  {
    symbol: 'DXY',
    slug: 'dxy',
    label: 'DXY',
    name: 'Chỉ số đô la Mỹ (DXY)',
    chartLabel: 'chỉ số đô la Mỹ DXY',
    type: 'index',
    currency: 'USD',
    sample: { daily: SAMPLE_DXY_DAILY, hourly: SAMPLE_DXY_HOURLY },
  },
  {
    symbol: 'USDVND',
    slug: 'usdvnd',
    label: 'USD/VND',
    name: 'Tỷ giá USD/VND',
    chartLabel: 'tỷ giá USD/VND',
    type: 'forex',
    currency: 'VND',
    sample: { daily: SAMPLE_USDVND_DAILY, hourly: SAMPLE_USDVND_HOURLY },
  },
];

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));
const BY_SLUG = new Map(INSTRUMENTS.map((i) => [i.slug, i]));

/** Tra mã theo symbol chuẩn (chữ hoa, khớp CSDL). `undefined` nếu không hỗ trợ. */
export function getInstrumentBySymbol(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol);
}

/** Tra mã theo slug URL (không phân biệt hoa/thường). `undefined` nếu không hỗ trợ. */
export function getInstrumentBySlug(slug: string): Instrument | undefined {
  return BY_SLUG.get(slug.toLowerCase());
}

/** Symbol này có nằm trong danh sách hỗ trợ không (dùng để validate input API). */
export function isSupportedSymbol(symbol: string): boolean {
  return BY_SYMBOL.has(symbol);
}
