/**
 * Quy đổi giá vàng thế giới (USD/troy ounce) sang VND/lượng để so sánh với giá vàng trong nước
 * (BTMC/SJC…, đơn vị VND/lượng — xem lib/providers-domestic/btmc.ts).
 *
 * Hằng số khối lượng: 1 troy ounce = 31.1034768 gram (định nghĩa quốc tế, chính xác tuyệt đối, không
 * phải số đo gần đúng); 1 lượng vàng Việt Nam = 37.5 gram (quy ước "1 cây vàng").
 */
export const TROY_OUNCE_GRAMS = 31.1034768;
export const LUONG_GRAMS = 37.5;

/** Số troy ounce trong 1 lượng — hệ số nhân để quy đổi USD/troy-oz sang USD/lượng. */
export const LUONG_IN_TROY_OUNCES = LUONG_GRAMS / TROY_OUNCE_GRAMS;

export interface WorldGoldPriceParams {
  /** Giá vàng thế giới, USD/troy ounce (vd giá đóng cửa nến XAU/USD mới nhất). */
  xauUsdPerOz: number;
  /** Tỷ giá, VND cho 1 USD (vd giá đóng cửa nến USD/VND mới nhất). */
  usdVndRate: number;
}

/** Quy đổi giá vàng thế giới (USD/troy oz) sang VND/lượng — mốc để so với giá vàng trong nước. */
export function worldGoldPricePerLuongVnd(params: WorldGoldPriceParams): number {
  return params.xauUsdPerOz * LUONG_IN_TROY_OUNCES * params.usdVndRate;
}

export interface DomesticGoldQuote {
  vendor: string;
  product: string;
  buy: number;
  sell: number;
}

export interface GoldPriceComparisonRow {
  vendor: string;
  product: string;
  domesticBuyVnd: number;
  domesticSellVnd: number;
  worldPerLuongVnd: number;
  /** Chênh lệch giá MUA trong nước so với giá thế giới quy đổi — dương nghĩa là trong nước ĐẮT hơn. */
  diffBuyVnd: number;
  diffBuyPercent: number;
  /** Chênh lệch giá BÁN trong nước so với giá thế giới quy đổi — dương nghĩa là trong nước ĐẮT hơn. */
  diffSellVnd: number;
  diffSellPercent: number;
}

/**
 * So sánh 1 dòng giá vàng trong nước với giá thế giới quy đổi cùng thời điểm. Chỉ tính toán thuần —
 * không tự fetch dữ liệu (world phải có giá trị hợp lệ, kiểm tra "đủ dữ liệu chưa" là việc của nơi
 * gọi, cùng quy ước với lib/analysis/rules/* — pure function không đoán khi thiếu dữ liệu).
 */
export function compareGoldPrice(
  domestic: DomesticGoldQuote,
  world: WorldGoldPriceParams,
): GoldPriceComparisonRow {
  const worldPerLuongVnd = worldGoldPricePerLuongVnd(world);
  const diffBuyVnd = domestic.buy - worldPerLuongVnd;
  const diffSellVnd = domestic.sell - worldPerLuongVnd;
  return {
    vendor: domestic.vendor,
    product: domestic.product,
    domesticBuyVnd: domestic.buy,
    domesticSellVnd: domestic.sell,
    worldPerLuongVnd,
    diffBuyVnd,
    diffBuyPercent: (diffBuyVnd / worldPerLuongVnd) * 100,
    diffSellVnd,
    diffSellPercent: (diffSellVnd / worldPerLuongVnd) * 100,
  };
}
