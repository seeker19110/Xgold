# Edge Function: `ingest-gold`

Thu thập nến XAU/USD mới nhất (1h + 1D) từ Twelve Data, chạy định kỳ qua `pg_cron` + `pg_net`.

> ⚠️ Chưa chạy/kiểm chứng được trong sandbox phát triển (không có Deno, mạng bị chặn tới Twelve
> Data — xem ADR-0003). **Bắt buộc test thật một lần** theo Bước 3 dưới đây trước khi tin tưởng.

## 1. Đặt secrets

```bash
npx supabase secrets set TWELVEDATA_API_KEY=<key-thật-từ-twelvedata.com>
```

(`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` được Supabase tự cấp sẵn cho mọi Edge Function —
không cần đặt tay.)

## 2. Deploy

```bash
npx supabase functions deploy ingest-gold
```

## 3. Test thật một lần (bắt buộc trước khi bật lịch)

```bash
curl -i -X POST 'https://<project-ref>.supabase.co/functions/v1/ingest-gold' \
  -H "Authorization: Bearer <service-role-key>"
```

Kiểm tra: response `results` có `status: "success"` cho cả `1h` và `1D`; đối chiếu bảng
`ingest_runs` và `candles` trên Supabase Studio thấy dữ liệu mới, hợp lý (không trùng lặp khi
gọi lại — upsert idempotent).

## 4. Bật lịch pg_cron (chạy trong SQL Editor của Supabase Studio, sau khi đã test Bước 3 thành công)

```sql
select cron.schedule(
  'ingest-gold-hourly',
  '5 * * * *', -- phút thứ 5 mỗi giờ — tránh trùng đỉnh phút 0 của nhiều cron khác
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/ingest-gold',
    headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
  );
  $$
);
```

Rollback (tắt lịch): `select cron.unschedule('ingest-gold-hourly');`
