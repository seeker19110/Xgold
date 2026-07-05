import type { Metadata } from 'next';
import { GoldComparePageClient } from '@/app/so-sanh-gia-vang/page-client';

export const metadata: Metadata = {
  title: 'So sánh giá vàng trong nước & thế giới — Xgold',
  description:
    'Quy đổi giá vàng thế giới (XAU/USD) sang VND/lượng theo tỷ giá USD/VND và so sánh với giá vàng trong nước.',
};

export default function GoldComparePage() {
  return <GoldComparePageClient />;
}
