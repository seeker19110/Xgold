<!--
ADR MẪU (đã điền) — minh họa cách áp dụng KHUNG 3 để chọn stack.
Đây là quyết định cho STACK THAM CHIẾU MẶC ĐỊNH của bộ khung. Một dự án thật có thể
thay file này bằng quyết định riêng (theo ý tưởng cụ thể), nhưng giữ đúng cấu trúc.
-->

# ADR-0001: Chọn stack tham chiếu (Next.js + Supabase + Vercel)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-06-29
- **Liên quan:** KHUNG 3 (research-first), `PROJECT.md` mục 4

## Bối cảnh

Cần một stack mặc định cho **web app điển hình**: CRUD + xác thực người dùng + ít realtime,
có yêu cầu SEO, ưu tiên mobile-first, ngân sách thấp, đội ngũ nhỏ (thường làm một mình + AI),
cần ra MVP nhanh nhưng vẫn an toàn kiểu dữ liệu và bảo mật.

Ràng buộc (theo KHUNG 3 B1): chi phí khởi điểm ~0đ; tránh khóa cứng nhà cung cấp ở tầng dữ liệu;
năng suất phát triển cao; cộng đồng lớn để dễ tìm trợ giúp và tài liệu.

> **Quy tắc chọn phiên bản (KHUNG 3 B4):** dùng bản ổn định mới nhất, đã **xác minh bằng nguồn sống
> ngày 2026-06-29** (npm registry / nodejs.org). Xác minh lại khi thực sự khởi tạo dự án.

## Quyết định

| Vai trò | Chọn | Phiên bản (xác minh 2026-06-29) |
|---------|------|--------------------------------|
| Runtime | Node.js LTS | 22.x ("Jod") / Active LTS hiện hành |
| Framework | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Ngôn ngữ | TypeScript (`strict`) | 6.x |
| CSS | Tailwind CSS (CSS-first, v4) | 4.x |
| CSDL + Auth + Realtime | Supabase (Postgres) | client `@supabase/supabase-js` 2.x |
| Hosting | Vercel (Preview = staging) | — |
| Validate runtime | Zod | 4.x |
| Test unit / E2E | Vitest / Playwright | 4.x / 1.x |
| Theo dõi lỗi | Sentry (`@sentry/nextjs`) | 10.x |

## Lý do (cân bằng độ phổ biến ↔ năng lực — KHUNG 3 B2)

- **Phần lõi chọn "đã được kiểm chứng":** Next.js + React + Postgres đều thuộc nhóm phổ biến nhất,
  hệ sinh thái & tài liệu lớn, nhiều người dùng thật → giảm rủi ro, dễ tìm trợ giúp.
- **Next.js** giải đúng nhu cầu SEO (SSR/SSG) + full-stack một repo (giảm phức tạp cho đội nhỏ).
- **Supabase** cho Postgres "chuẩn vàng" + RLS + auth sẵn, nhưng **vẫn là Postgres thuần** nên
  ít khóa cứng nhà cung cấp hơn các BaaS độc quyền — đổi hosting CSDL về sau khả thi.
- **Vercel** tích hợp Next tốt nhất và **Preview cho mỗi PR = môi trường staging gần như miễn phí**.
- **TypeScript `strict` + Zod** = an toàn kiểu lúc biên dịch + validate dữ liệu ngoài lúc chạy.
- **Cách tân có kiểm soát:** chỉ chấp nhận major mới ở nơi lợi ích rõ (Tailwind 4 CSS-first, Next 16),
  không cách tân đồng thời ở nhiều tầng nền móng.

## Các phương án đã cân nhắc

**Framework:**
- *Remix / React Router 7* — tốt cho web chuẩn, nhưng cộng đồng & ví dụ ít hơn Next; loại.
- *Astro* — tuyệt cho site nội dung/tĩnh nặng SEO, yếu hơn cho app nhiều tương tác; loại cho app điển hình.
- *SvelteKit* — DX tốt, nhưng hệ sinh thái/nhân lực nhỏ hơn React; loại để ưu tiên độ phổ biến.

**CSDL / backend:**
- *Firebase* — nhanh để bắt đầu nhưng NoSQL khóa cứng, truy vấn quan hệ khó; loại.
- *PlanetScale / Neon + backend tự viết* — linh hoạt nhưng tốn công dựng auth/realtime; loại cho MVP.
- → **Supabase** cân bằng tốt nhất giữa tốc độ khởi động và tính "Postgres mở".

**Hosting:** Netlify / Cloudflare / tự host VPS — khả thi, nhưng tích hợp Next + Preview của Vercel mượt nhất; chọn Vercel, để ngỏ chuyển sau.

**CSS:** CSS Modules / styled-components — ổn, nhưng Tailwind cho năng suất cao + hợp design tokens/theme; chọn Tailwind.

## Hệ quả

**Tích cực:**
- Một repo full-stack, cộng đồng lớn, chi phí khởi điểm thấp, staging miễn phí, an toàn kiểu dữ liệu.
- Các file cấu hình trong bộ khung (CI, hook, env, theme, i18n, PWA) đều khớp stack này.

**Đánh đổi / rủi ro phải chấp nhận:**
- **Major còn mới** (Next 16, Tailwind 4, TS 6, Zod 4) → một số thư viện phụ trợ có thể chậm tương thích;
  giảm thiểu bằng cách đọc ghi chú nâng cấp và né bản `x.0.0`.
- **Serwist (PWA) chưa hỗ trợ Turbopack** → dev PWA phải dùng `--webpack`.
- **Phụ thuộc Vercel/Supabase** ở tầng vận hành; giảm thiểu vì dữ liệu vẫn là Postgres chuẩn (di chuyển được).

**Việc cần làm tiếp:**
- Khi khởi tạo: **xác minh lại phiên bản** (KHUNG 3 B4) và chạy "kiểm chứng hàng rào" (Bước 14).
- Nếu ý tưởng lệch khỏi "web app điển hình" (mobile native, nội dung tĩnh nặng, realtime/đồng tác nặng),
  viết **ADR mới** thay thế ADR này thay vì dùng mặc định một cách máy móc.
