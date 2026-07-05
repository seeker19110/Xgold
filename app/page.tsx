import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { INSTRUMENTS } from '@/lib/instruments';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Xgold — Giá vàng &amp; chỉ báo kỹ thuật</h1>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground">
        Theo dõi giá kim loại quý (vàng XAU/USD, bạc XAG/USD), chỉ số đô la Mỹ (DXY) và tỷ giá
        USD/VND với chart nến kiểu TradingView, đường trung bình động (Multi-MA), RSI, MACD,
        Bollinger Bands và gợi ý phân tích kỹ thuật.
      </p>

      <section aria-labelledby="charts-heading" className="flex flex-col gap-3">
        <h2 id="charts-heading" className="text-muted-foreground text-sm font-medium">
          Chọn mã để xem chart
        </h2>
        <div className="flex flex-wrap gap-3">
          {INSTRUMENTS.map((instrument) => (
            <Link
              key={instrument.slug}
              href={`/chart/${instrument.slug}`}
              className="bg-primary text-primary-foreground w-fit rounded-lg px-4 py-2 font-medium"
            >
              {instrument.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/gia-vang-trong-nuoc"
          className="border-border text-foreground w-fit rounded-lg border px-4 py-2 font-medium"
        >
          Giá vàng trong nước
        </Link>
        <Link
          href="/so-sanh-gia-vang"
          className="border-border text-foreground w-fit rounded-lg border px-4 py-2 font-medium"
        >
          So sánh giá trong nước &amp; thế giới
        </Link>
      </div>
    </main>
  );
}
