# Edge Function: `ingest-domestic-gold`

Thu thập giá vàng trong nước (BTMC — mua vào/bán ra) từ `api.btmc.vn`, chạy định kỳ qua `pg_cron` +
`pg_net`.

> ⚠️ **Rủi ro cao hơn `ingest-gold`:** ngoài việc chưa chạy/kiểm chứng được trong sandbox phát triển
> (không có Deno, mạng bị chặn tới BTMC), **định dạng response XML dưới đây CHƯA được xác nhận bằng
> dữ liệu thật** — chỉ dựa trên tài liệu tổng hợp từ nhiều nguồn độc lập (xem ADR-0005). **Bước 3
> dưới đây không chỉ là "test cho chắc" — đây là bước ĐỐI CHIẾU field thật lần đầu tiên**, bắt buộc
> làm trước khi tin tưởng bất kỳ dữ liệu nào từ function này.

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

Trước khi tin tưởng response `{"status":"success","rows":N}`:

1. Gọi trực tiếp endpoint BTMC (`curl 'http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=<key>'`) và
   **đọc XML thật** — đối chiếu tên thẻ với giả định trong `index.ts` (`n_1`, `pb_1`, `ps_1`, `d_1`,
   định dạng ngày `dd/MM/yyyy HH:mm`). Nếu lệch, sửa `index.ts` VÀ
   `lib/providers-domestic/btmc.ts` (giữ 2 bản đồng bộ — xem comment đầu file) rồi deploy lại.
2. Đối chiếu bảng `domestic_gold_prices` trên Supabase Studio: giá trị `buy`/`sell` hợp lý (đúng
   đơn vị VNĐ, không lệch bậc 10 do đọc sai field), `ts` đúng giờ UTC tương ứng giờ Việt Nam thật.
3. Gọi lại lần 2 — xác nhận `rows_upserted` không tạo dòng trùng (upsert idempotent theo khóa
   `(vendor, product, ts)`).
4. Đối chiếu `domestic_gold_ingest_runs` — `status: 'success'`.

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
