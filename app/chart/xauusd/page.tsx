import type { Metadata } from 'next';
import { ChartPageClient } from '@/app/chart/xauusd/chart-page-client';

export const metadata: Metadata = {
  title: 'Chart XAU/USD — Xgold',
  description: 'Chart nến giá vàng thế giới (XAU/USD) kiểu TradingView với Multi-MA và Multi-RSI.',
};

export default function ChartXauUsdPage() {
  return <ChartPageClient />;
}
