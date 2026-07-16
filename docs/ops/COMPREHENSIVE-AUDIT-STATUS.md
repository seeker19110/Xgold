# Trạng thái Audit toàn diện

> AI đọc/ghi file này để biết quét tới đâu — cho phép tiếp tục qua nhiều phiên.
> Trạng thái mỗi nhóm: ⬜ Chưa quét · 🔄 Đang dở · ✅ Xong · ➖ Không áp dụng.

- Lần quét bắt đầu: 2026-07-03 · **Quét lại lần 2: 2026-07-16** (bao phủ Đợt 6–14, thêm Ichimoku,
  RSI-stack, Entry/SL/TP, DXY/USD-VND, so sánh giá vàng, dải timeframe đầy đủ, Volume/Legend, CSV).
- Hồ sơ dự án áp dụng (KHUNG-3 PHẦN C): C1 Web app + C4 dữ liệu/ingestion (Next.js + Supabase)

| #   | Nhóm                            | Trạng thái | Tóm tắt phát hiện (số lượng theo mức độ)                                                                                 | Cập nhật lần cuối |
| --- | ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | Kiến trúc & thiết kế            | ✅         | 0 mới (rule engine 8 module vẫn 1 interface nhất quán; providers quốc tế/trong nước cùng pattern)                        | 2026-07-16        |
| 2   | Bảo mật                         | ✅         | 0 mới (`npm audit --omit=dev` 0 lỗ hổng; `?cfg=` vẫn qua Zod; migration mới giữ đúng RLS/CHECK/GRANT)                    | 2026-07-16        |
| 3   | Chất lượng mã & chống lỗi logic | ✅         | 1 Trung (F-011) + 1 Thấp (F-018)                                                                                         | 2026-07-16        |
| 4   | Kiểm thử & coverage             | ✅         | 1 Cao (F-012) + 2 Trung (F-013, F-014)                                                                                   | 2026-07-16        |
| 5   | Hiệu năng                       | ✅         | 1 Trung (F-015 — thiếu 2 route mới trong Lighthouse CI)                                                                  | 2026-07-16        |
| 6   | Accessibility & UI/UX           | ✅         | 0 mới (nút CSV/bảng so sánh/legend Ichimoku đều có role/aria-label phù hợp, đọc code xác nhận)                           | 2026-07-16        |
| 7   | Dependency & chuỗi cung ứng     | ✅         | 1 Thấp (F-019 — 3 dependency lệch major, không phải lỗ hổng)                                                             | 2026-07-16        |
| 8   | CI/CD & vận hành/observability  | ✅         | 0 mới (branch protection vẫn không kiểm chứng được qua tool sẵn có)                                                      | 2026-07-16        |
| 9   | Tài liệu & đồng bộ              | ✅         | 2 Thấp (F-016 — CLAUDE.md §10 thiếu nhiều thư mục mới; F-017 — FEATURE-MAP/audit status cũ, **đã vá bằng lần quét này**) | 2026-07-16        |
| 10  | Dữ liệu & migration             | ✅         | 0 mới (migration DXY/USD-VND + mở rộng timeframe đều tái dùng đúng RLS/CHECK/GRANT có sẵn)                               | 2026-07-16        |
| 11  | Cấu hình môi trường & bí mật    | ✅         | 0 mới (`.env.example` vẫn tồn tại, xác nhận qua `git ls-files`)                                                          | 2026-07-16        |
| 12  | Thống nhất chéo tính năng       | ✅         | 1 Thấp (F-020 — nhánh `default` resample chưa có test riêng, không xác nhận là lỗi)                                      | 2026-07-16        |

## Ghi chú điểm dừng

- Quét lại lần 2 xong trọn 12 nhóm trong 1 phiên (giao khảo sát cho subagent Explore, phiên chính tổng
  hợp phát hiện + lập kế hoạch) — không có nhóm dở dang.
- Nhóm 8 (branch protection rules): vẫn không có tool GitHub MCP nào lộ endpoint kiểm tra — không tính
  là phát hiện (tránh đoán), giữ nguyên ghi chú từ lần quét đầu.
- Danh sách đầy đủ F-011..F-020 kèm bằng chứng cụ thể: xem `docs/ops/COMPLETION-PLAN.md`.
- Bài học lần quét đầu (F-002 báo động giả do sandbox chặn đọc `.env*`) vẫn áp dụng — đã dùng
  `git ls-files` để xác nhận lại, không lặp lại sai lầm.
