import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Xgold — Giá vàng &amp; chỉ báo kỹ thuật</h1>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground">
        Theo dõi giá vàng thế giới (XAU/USD) với chart nến kiểu TradingView, đường trung bình động
        (Multi-MA) và RSI (Multi-RSI).
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/chart/xauusd"
          className="bg-primary text-primary-foreground w-fit rounded-lg px-4 py-2 font-medium"
        >
          Xem chart XAU/USD
        </Link>
        <Link
          href="/gia-vang-trong-nuoc"
          className="border-border text-foreground w-fit rounded-lg border px-4 py-2 font-medium"
        >
          Giá vàng trong nước
        </Link>
      </div>
    </main>
  );
}
