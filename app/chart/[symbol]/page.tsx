import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { INSTRUMENTS, getInstrumentBySlug } from '@/lib/instruments';
import { ChartPageClient } from '@/app/chart/[symbol]/chart-page-client';

// Chỉ dựng các slug có trong registry — slug lạ → 404 do framework (không cần render component).
export const dynamicParams = false;

export function generateStaticParams(): { symbol: string }[] {
  return INSTRUMENTS.map((instrument) => ({ symbol: instrument.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const instrument = getInstrumentBySlug(symbol);
  if (!instrument) return { title: 'Không tìm thấy mã — Xgold' };
  return {
    title: `Chart ${instrument.label} — Xgold`,
    description: `Chart nến ${instrument.chartLabel} kiểu TradingView với Multi-MA, RSI, MACD, Bollinger Bands và gợi ý phân tích kỹ thuật.`,
  };
}

export default async function ChartSymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const instrument = getInstrumentBySlug(symbol);
  if (!instrument) notFound();

  return (
    <ChartPageClient
      symbol={instrument.symbol}
      slug={instrument.slug}
      label={instrument.label}
      chartLabel={instrument.chartLabel}
    />
  );
}
