import { correlationXauDxy, ratioSeries } from '@/lib/analysis';
import type { MarketContextCandles } from '@/components/screener/use-screener';

interface MarketContextProps {
  candles: MarketContextCandles;
}

function ratioInterpretation(): string {
  return 'Tỷ lệ cao hơn → bạc rẻ tương đối so với vàng (không phải khuyến nghị mua/bán).';
}

function correlationLabel(correlation: number | null): string {
  if (correlation === null) return 'chưa đủ dữ liệu';
  if (correlation <= -0.5) return 'nghịch biến mạnh';
  if (correlation <= -0.2) return 'nghịch biến';
  if (correlation <= 0.2) return 'ít tương quan';
  return 'đồng biến';
}

/**
 * Thẻ "Bối cảnh thị trường" trên trang screener (Đợt 10, mục 4.2): tỷ lệ Vàng/Bạc + tương quan
 * XAU↔DXY 30 phiên ngày — chỉ số + diễn giải ngắn, KHÔNG phải khuyến nghị đầu tư (v1 không thêm
 * chart mới, xem ADR-0010).
 */
export function MarketContext({ candles }: MarketContextProps) {
  const ratioLatest = ratioSeries(candles.xau1D, candles.xag1D).at(-1)?.ratio ?? null;
  const correlation = correlationXauDxy(candles.xau1D, candles.dxy1D, 30);

  return (
    <section
      aria-labelledby="market-context-heading"
      className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2 id="market-context-heading" className="text-sm font-semibold">
        Bối cảnh thị trường
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-border rounded-md border p-3">
          <p className="text-muted-foreground text-xs">Tỷ lệ Vàng/Bạc (XAU/XAG)</p>
          <p className="text-lg font-semibold tabular-nums">
            {ratioLatest !== null ? ratioLatest.toFixed(2) : 'chưa đủ dữ liệu'}
          </p>
          {ratioLatest !== null && (
            <p className="text-muted-foreground text-xs">{ratioInterpretation()}</p>
          )}
        </div>

        <div className="border-border rounded-md border p-3">
          <p className="text-muted-foreground text-xs">Tương quan XAU ↔ DXY (30 phiên ngày)</p>
          <p className="text-lg font-semibold tabular-nums">
            {correlation !== null ? correlation.toFixed(2) : 'chưa đủ dữ liệu'}
          </p>
          <p className="text-muted-foreground text-xs">{correlationLabel(correlation)}</p>
        </div>
      </div>
    </section>
  );
}
