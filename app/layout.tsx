import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xgold — Giá vàng & chỉ báo kỹ thuật',
  description:
    'Theo dõi giá vàng thế giới (XAU/USD) với chart nến, đường trung bình động (Multi-MA) và RSI (Multi-RSI).',
};

// Đặt theme trước khi React hydrate để tránh "nháy" sai theme khi tải trang
// (docs/framework/quality-supplements.md PHẦN 3, Bước 3). Nội dung là hằng số ta tự viết, không phải dữ liệu người dùng.
const noFlashTheme = `
  (function () {
    try {
      var t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') {
        document.documentElement.setAttribute('data-theme', t);
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
