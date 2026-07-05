# Edge Function: `ingest-gold`

Thu thập nến mới nhất (1h + 1D) cho **mọi mã** trong mảng `INSTRUMENTS` ở đầu `index.ts`
(hiện: XAU/USD, XAG/USD, DXY, USD/VND) từ Twelve Data, chạy định kỳ qua `pg_cron` + `pg_net`.

> ⚠️ Mã Twelve Data của DXY (`DXY`) và USD/VND (`USD/VND`) suy từ tài liệu công khai + tìm kiếm, KHÔNG
> gọi API thật xác nhận được (mạng sandbox chặn — xem ADR-0009). Ở Bước 3, kiểm tra riêng 2 mã này
> KỸ hơn: nếu `status: "error"` hoặc dữ liệu trả về sai định dạng/đơn vị (vd DXY không phải quanh
> 95–110 điểm, USD/VND không phải quanh 24.000–27.000), sửa lại `twelveDataSymbol` trong `INSTRUMENTS`
> trước khi bật pg_cron cho 2 mã này.

> ⚠️ Mảng `INSTRUMENTS` phải giữ **đồng bộ thủ công** với registry `lib/instruments.ts` (Deno không
> import được path alias `@/…`) và với seed migration `instruments`. Thêm mã: thêm một dòng ở cả ba
> nơi (registry, mảng này, migration seed).

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

Kiểm tra: response `results` có `status: "success"` cho từng mã (`symbol`) × cả `1h` và `1D`; đối
chiếu bảng `ingest_runs` và `candles` trên Supabase Studio thấy dữ liệu mới, hợp lý (không trùng lặp
khi gọi lại — upsert idempotent). Nếu một mã chưa có trong bảng `instruments` (quên chạy migration
seed) thì `results` sẽ có mục `status: "error"` cho mã đó nhưng KHÔNG chặn các mã khác.

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
