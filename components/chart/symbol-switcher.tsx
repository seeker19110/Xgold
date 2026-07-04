import Link from 'next/link';
import { INSTRUMENTS } from '@/lib/instruments';

/**
 * Thanh chuyển mã (XAU/USD ⇄ XAG/USD …). Mỗi mã là một route riêng (`/chart/{slug}`) nên dùng Link
 * điều hướng thật thay vì state — chia sẻ URL được, back/forward hoạt động. Đọc danh sách từ registry
 * `lib/instruments.ts` (thêm mã mới tự xuất hiện, không sửa component này).
 */
export function SymbolSwitcher({ currentSlug }: { currentSlug: string }) {
  return (
    <nav aria-label="Chọn mã" className="flex flex-wrap gap-2">
      {INSTRUMENTS.map((instrument) => {
        const active = instrument.slug === currentSlug;
        return (
          <Link
            key={instrument.slug}
            href={`/chart/${instrument.slug}`}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'bg-primary text-primary-foreground flex min-h-11 items-center rounded-md px-3 text-sm font-medium'
                : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground flex min-h-11 items-center rounded-md border px-3 text-sm font-medium'
            }
          >
            {instrument.label}
          </Link>
        );
      })}
    </nav>
  );
}
