// Trang 404 thân thiện (GĐ 7). Server Component.
// Dùng token theme (yêu cầu đã nối styles/theme.css — xem quality-supplements.md PHẦN 3).
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Trang bạn tìm không tồn tại hoặc đã được chuyển đi.</p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 font-medium"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
