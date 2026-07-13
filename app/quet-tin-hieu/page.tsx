import type { Metadata } from 'next';
import { ScreenerPageClient } from '@/app/quet-tin-hieu/page-client';

export const metadata: Metadata = {
  title: 'Quét tín hiệu kỹ thuật — Xgold',
  description:
    'Quét tín hiệu kỹ thuật Mua/Bán/Trung lập của mọi mã (vàng, bạc, DXY, USD/VND) theo khung thời gian, kèm tỷ lệ Vàng/Bạc và tương quan XAU/DXY.',
};

export default function ScreenerPage() {
  return <ScreenerPageClient />;
}
