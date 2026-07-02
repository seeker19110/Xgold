# supabase/ — CSDL có phiên bản (migration + RLS)

> Thư mục này là **"phiên bản" của cơ sở dữ liệu**. Mọi thay đổi schema đi qua migration
> có dấu thời gian trong `migrations/` và **luôn được commit vào Git** (KHUNG 1, GĐ 2 & 6).

## File trong đây

- `migrations/20260630000000_init_example.sql` — **migration MẪU đã điền** (bảng `tasks` +
  ràng buộc + index + trigger `updated_at` + **RLS bật + policy theo chủ sở hữu**). Đây chỉ là
  ví dụ tham chiếu minh họa nguyên tắc — **thay bằng schema thật của dự án**, giữ đúng các nguyên tắc.

> `npx supabase init` sẽ sinh thêm `config.toml` (cấu hình local). Commit nó khi khởi tạo dự án thật.

## Quy trình (tóm tắt — chi tiết: `docs/framework/quality-supplements.md` Nhóm 1 mục 2)

```bash
npx supabase init                       # tạo thư mục supabase/ (lần đầu)
npx supabase link --project-ref <ref>   # nối tới project trên cloud
npx supabase migration new ten_thay_doi # tạo migration mới (viết SQL tay)
npx supabase db reset                   # áp dụng lại toàn bộ migration lên CSDL local
npx supabase db push                    # đẩy lên production (sau khi test kỹ + có backup)
```

## Nguyên tắc bất biến

- **RLS bật + đã test** trước khi mở cho người ngoài (mặc định bật RLS là từ chối tất cả → phải khai policy).
- **Rollback:** Supabase chạy tiến, không tự lùi → viết migration **bù trừ** hoặc khôi phục từ **backup/PITR**.
  Trước mỗi migration đụng dữ liệu thật: đảm bảo đã có backup và đã nghĩ sẵn đường lùi.
- **Không test trên dữ liệu production thật** — dùng CSDL local (`supabase start`) hoặc project "staging" riêng.
