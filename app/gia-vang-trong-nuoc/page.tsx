import type { Metadata } from 'next';
import { DomesticGoldPageClient } from '@/app/gia-vang-trong-nuoc/page-client';

export const metadata: Metadata = {
  title: 'Giá vàng trong nước — Xgold',
  description:
    'Bảng giá vàng trong nước (mua vào/bán ra) từ Bảo Tín Minh Châu, cập nhật gần realtime.',
};

export default function DomesticGoldPage() {
  return <DomesticGoldPageClient />;
}
