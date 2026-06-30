# Chính sách bảo mật

Bảo mật là một trụ cột của bộ khung này (CLAUDE.md mục 3). Tài liệu này nói **cách báo cáo lỗ hổng**
và **các hàng rào bảo mật tự động** đang chạy.

## Báo cáo lỗ hổng

**Đừng** mở issue công khai cho lỗ hổng bảo mật. Thay vào đó:

- Dùng **GitHub Security Advisories**: tab **Security → Report a vulnerability** (private disclosure), hoặc
- Gửi email tới người bảo trì repo.

Vui lòng kèm: mô tả, bước tái hiện, ảnh hưởng dự kiến, và phiên bản/commit liên quan.
Mục tiêu phản hồi: xác nhận trong vòng **72 giờ**; thống nhất mốc vá trước khi công bố.

## Hàng rào bảo mật tự động trong repo

| Lớp | Công cụ | Bắt gì |
|-----|---------|--------|
| Phụ thuộc | `npm audit --audit-level=high` (CI) + Dependabot | thư viện có lỗ hổng đã biết |
| Mã nguồn (SAST) | CodeQL (`.github/workflows/codeql.yml`) | lỗ hổng trong code (injection, XSS, luồng dữ liệu...) |
| Bí mật | gitleaks (`.github/workflows/secret-scan.yml`) | API key/token/mật khẩu lỡ commit |
| Biến môi trường | `lib/env.ts` (Zod) | thiếu/sai biến → dừng ngay khi khởi động |
| CSDL | RLS bật + policy (`supabase/migrations/`) | truy cập dữ liệu của người khác |

> **Thiết lập một lần cho CodeQL:** bật **Code scanning** trong repo (Settings → Code security & analysis).
> Nếu chưa bật, job CodeQL sẽ lỗi "Code scanning is not enabled for this repository" khi upload kết quả.
> Repo public: miễn phí. Repo private: cần GitHub Advanced Security. Repo khung chưa có app sẽ tự bỏ qua CodeQL.

## Nguyên tắc bất biến (không bao giờ phá)

- **Bí mật không bao giờ vào Git** — dùng biến môi trường (`.env*` đã bị `.gitignore` chặn).
- **Không tin client** — logic nhạy cảm (kiểm tra quyền, tính toán quan trọng) luôn ở server.
- Truy vấn **tham số hóa** (chống SQL injection); **escape** dữ liệu ra HTML (chống XSS).
- **RLS bật và đã test** trước khi mở cho người ngoài.
- Mọi đầu vào (người dùng/API/CSDL) **validate lúc chạy** trước khi dùng.
