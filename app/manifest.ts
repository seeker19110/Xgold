// PWA: web app manifest (GĐ 7 + PWA). Đổi tên/màu/icon cho khớp thương hiệu.
// theme_color/background_color lấy theo nền Dark blue mặc định.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Xgold — Giá vàng & chỉ báo kỹ thuật',
    short_name: 'Xgold',
    description: 'Theo dõi giá vàng thế giới (XAU/USD) với chart nến, Multi-MA và Multi-RSI.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#0b1220',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
