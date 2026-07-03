# Edge Function: `ingest-domestic-gold`

Thu thập giá vàng trong nước, chạy định kỳ qua `pg_cron` + `pg_net`. Nguồn **CHÍNH**: BTMC
(`api.btmc.vn`). Nguồn **DỰ PHÒNG** (chỉ dùng khi BTMC lỗi): vang.today (`www.vang.today/api/prices`,
ADR-0006). Response trả `provider` cho biết nguồn nào vừa ghi dữ liệu.

> ⚠️ **BTMC — rủi ro cao hơn `ingest-gold`:** ngoài việc chưa chạy/kiểm chứng được trong sandbox phát
> triển (không có Deno, mạng bị chặn tới BTMC), **định dạng response XML dưới đây CHƯA được xác nhận
> bằng dữ liệu thật** — chỉ dựa trên tài liệu tổng hợp từ nhiều nguồn độc lập (xem ADR-0005). **Bước 3
> dưới đây không chỉ là "test cho chắc" — đây là bước ĐỐI CHIẾU field thật lần đầu tiên**, bắt buộc
> làm trước khi tin tưởng bất kỳ dữ liệu nào từ function này.
>
> **vang.today — đã xác nhận bằng response JSON thật** qua `WebFetch` trực tiếp ngày 2026-07-04
> (ADR-0006), độ tin cậy cao hơn BTMC lúc khởi tạo. Vẫn nên test `curl` thật ở Bước 3 vì mạng
> production Supabase khác môi trường AI đã xác minh, và service này không có key/SLA/tài liệu chính
> thức — có thể đổi field không báo trước.

## 1. Đặt secrets

```bash
npx supabase secrets set BTMC_API_KEY=<key-thật-từ-btmc.vn>
```

(`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` được Supabase tự cấp sẵn cho mọi Edge Function —
không cần đặt tay.)

## 2. Deploy

```bash
npx supabase functions deploy ingest-domestic-gold
```

## 3. Test thật một lần + ĐỐI CHIẾU FIELD (bắt buộc trước khi bật lịch)

```bash
curl -i -X POST 'https://<project-ref>.supabase.co/functions/v1/ingest-domestic-gold' \
  -H "Authorization: Bearer <service-role-key>"
```

Trước khi tin tưởng response `{"status":"success","provider":"btmc"|"vang-today","rows":N}`:

1. Gọi trực tiếp endpoint BTMC (`curl 'http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=<key>'`) và
   **đọc XML thật** — đối chiếu tên thẻ với giả định trong `index.ts` (`n_1`, `pb_1`, `ps_1`, `d_1`,
   định dạng ngày `dd/MM/yyyy HH:mm`). Nếu lệch, sửa `index.ts` VÀ
   `lib/providers-domestic/btmc.ts` (giữ 2 bản đồng bộ — xem comment đầu file) rồi deploy lại.
   1b. Gọi trực tiếp `curl 'https://www.vang.today/api/prices'` — đối chiếu field (`timestamp`,
   `prices.<mã>.{name,buy,sell,currency}`) với whitelist mã→vendor trong `index.ts` VÀ
   `lib/providers-domestic/vang-today.ts` (giữ 2 bản đồng bộ). Nếu vang.today thêm mã sản phẩm mới,
   mã đó bị bỏ qua tới khi cập nhật whitelist ở cả 2 file (an toàn — xem ADR-0006).
2. Đối chiếu bảng `domestic_gold_prices` trên Supabase Studio: giá trị `buy`/`sell` hợp lý (đúng
   đơn vị VNĐ, không lệch bậc 10 do đọc sai field), `ts` đúng giờ UTC tương ứng giờ Việt Nam thật.
3. Gọi lại lần 2 — xác nhận `rows_upserted` không tạo dòng trùng (upsert idempotent theo khóa
   `(vendor, product, ts)`).
4. Đối chiếu `domestic_gold_ingest_runs` — `status: 'success'`, cột `provider` đúng nguồn vừa gọi.
5. (Tùy chọn, để test nhánh dự phòng) tạm đổi `BTMC_API_KEY` thành giá trị sai, gọi lại function —
   xác nhận `provider: 'vang-today'` trong response và dữ liệu vẫn ghi đúng, rồi đặt lại key thật.

## 4. Bật lịch pg_cron (chạy trong SQL Editor của Supabase Studio, CHỈ sau khi Bước 3 xác nhận field khớp)

```sql
select cron.schedule(
  'ingest-domestic-gold-15min',
  '*/15 * * * *', -- mỗi 15 phút — khớp STALE_THRESHOLD_MINUTES=30 (2×) trong lib/domestic-gold/freshness.ts
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/ingest-domestic-gold',
    headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
  );
  $$
);
```

Rollback (tắt lịch): `select cron.unschedule('ingest-domestic-gold-15min');`
