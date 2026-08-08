# Checklist đợt kết nối Supabase thật (go-live)

> Gộp thao tác từ `supabase/README.md`, `supabase/functions/ingest-gold/README.md`,
> `supabase/functions/ingest-domestic-gold/README.md`, `PROGRESS.md` ("Nợ kỹ thuật") thành MỘT
> trình tự chạy tay, đúng thứ tự phụ thuộc. Toàn bộ bước dưới đây **chỉ chạy được ngoài sandbox
> phát triển** (mạng sandbox chặn Twelve Data/Stooq/SJC/BTMC, không có Docker/Deno — xem ADR-0003).
> Đánh dấu ✅ vào file này khi xong từng bước để phiên AI sau biết đã làm tới đâu.

## 0. Trước khi bắt đầu

- [ ] Có tài khoản Supabase, tạo project mới (Free/Pro tùy nhu cầu) — ghi lại `<project-ref>`.
- [ ] Đăng ký [Twelve Data](https://twelvedata.com/) (free tier: 800 credits/ngày, đủ cho 4 mã ×
      3 khung theo lịch giờ — xem tính toán ở cuối `supabase/functions/ingest-gold/README.md`), lấy
      `TWELVEDATA_API_KEY`.
- [ ] Cài Supabase CLI nếu chưa có: `npm install -g supabase` (hoặc dùng `npx supabase`).

## 1. Migration schema (theo thứ tự file trong `supabase/migrations/`)

- [ ] `npx supabase login`
- [ ] `npx supabase link --project-ref <project-ref>`
- [ ] `npx supabase db push` — áp toàn bộ 5 migration hiện có: `xgold_schema`,
      `domestic_gold_prices`, `add_xagusd_instrument`, `add_dxy_usdvnd_instruments`,
      `expand_timeframes_m5_to_1m`.
- [ ] Xác nhận trên Supabase Studio: bảng `instruments` có đủ **4 mã** (XAUUSD, XAGUSD, DXY,
      USDVND — đối chiếu `lib/instruments.ts`), bảng `candles`/`ingest_runs` tồn tại, RLS **bật**
      (đọc công khai, ghi chỉ `service_role` — xem `supabase/README.md`).

## 2. Biến môi trường ứng dụng (Next.js)

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (đọc `lib/env.ts`/
      `lib/supabase/client.ts` để xác nhận đúng tên biến trước khi set — không đoán).
- [ ] Không set `TWELVEDATA_API_KEY` phía Next.js — khóa provider chỉ sống trong Edge Function/
      secrets (CLAUDE.md §3.2: không lộ khóa API ra client).

## 3. Backfill lịch sử (`npm run backfill`) — chạy TRƯỚC khi bật `pg_cron`

- [ ] Set biến môi trường cục bộ (không commit): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `TWELVEDATA_API_KEY`.
- [ ] `npm run backfill` — chạy cho MỌI mã trong `INSTRUMENTS`: Stooq cho `1D` (toàn bộ lịch sử có
      sẵn, không cần key), Twelve Data cho `1h` + `5m` (giới hạn `outputsize: 5000`/lần — free tier).
- [ ] Đọc log: mỗi mã phải có 3 dòng "Xong: N dòng" (không phải "LỖI"). Một mã lỗi không chặn mã
      khác — nếu có lỗi, đọc message rồi quyết định chạy lại riêng mã đó.
- [ ] Đối chiếu Supabase Studio: `ingest_runs` có bản ghi `status: success` cho từng
      `(instrument, provider, timeframe)`; `candles` có dữ liệu, không trùng khóa
      `(instrument_id, timeframe, ts)`.
- [ ] **Đặc biệt chú ý DXY/USD-VND** (ADR-0009): mã Twelve Data suy từ tài liệu, chưa từng gọi
      API thật xác nhận. Nếu `status: error` hoặc giá trị sai đơn vị hiển nhiên (DXY không quanh
      95–110, USD/VND không quanh 24.000–27.000) → sửa `twelveDataSymbol` trong
      `lib/instruments.ts` VÀ mảng `INSTRUMENTS` đồng bộ tay trong
      `supabase/functions/ingest-gold/index.ts` (xem cảnh báo đồng bộ 3 nơi trong README đó).

## 4. Deploy + test tay Edge Function `ingest-gold` (bắt buộc trước khi bật lịch)

- [ ] `npx supabase secrets set TWELVEDATA_API_KEY=<key>`
- [ ] `npx supabase functions deploy ingest-gold`
- [ ] `curl -i -X POST 'https://<project-ref>.supabase.co/functions/v1/ingest-gold' -H "Authorization: Bearer <service-role-key>"`
- [ ] Response `results`: `status: success` cho từng mã × `5m`/`1h`/`1D`. Gọi lại lần 2 ngay sau đó
      → xác nhận **idempotent** (không tạo dòng trùng trong `candles`, `rows_upserted` hợp lý).

## 5. Deploy + test tay `ingest-domestic-gold` (nếu dùng giá vàng trong nước)

- [ ] Làm theo `supabase/functions/ingest-domestic-gold/README.md` (cùng khuôn mẫu bước 4).

## 6. Bật `pg_cron` (chỉ sau khi bước 4–5 đã xanh)

- [ ] Chạy SQL `cron.schedule('ingest-gold-hourly', '5 * * * *', ...)` trong Supabase Studio SQL
      Editor (nguyên văn ở `supabase/functions/ingest-gold/README.md` mục 4).
- [ ] Chờ 1 chu kỳ (>1 giờ), xác nhận `ingest_runs` có bản ghi mới tự động, không cần gọi tay.
- [ ] Ghi lại lịch đã bật vào `PROGRESS.md` (mục "Đã xong") kèm ngày giờ xác nhận.

## 7. Đối chiếu chỉ báo với nguồn tham chiếu (TradingView hoặc tương đương)

> Mục đích: phát hiện lệch do quy ước timestamp/OHLC khác nhau giữa Twelve Data/Stooq và
> TradingView — random-walk fixture không thể lộ ra loại lỗi này.

- [ ] `npm run signal-stats` trên dữ liệu THẬT (không phải fixture) — đối chiếu số lượng/năm tín
      hiệu buy/sell có hợp lý không (không phải 0 tuyệt đối, không phải quá dày).
- [ ] Chọn 3–5 mốc thời gian bất kỳ trên `/chart/xauusd` (1D), so nến Close với TradingView cùng
      ngày UTC — sai lệch > 0.5% cần điều tra (thường do lệch múi giờ đóng nến giữa 2 nguồn).
- [ ] Kiểm tra riêng một tín hiệu Entry/SL/TP thật (mục "Mức tham chiếu giao dịch") — xác nhận
      `entry`/`sl`/`tp1`/`tp2` không `null` bất thường trên dữ liệu đủ dài (khác ca F-018 cố ý).
- [ ] Kiểm tra lỗi phân trang đã vá (2026-08-08, xem `PROGRESS.md`): sau backfill dữ liệu > 2000
      dòng ở khung `5m`, xác nhận `/api/candles?symbol=XAUUSD&timeframe=5m` trả nến **MỚI NHẤT**,
      không phải cũ nhất — đây là kịch bản thật đầu tiên có thể vượt `MAX_CANDLES`.

## 8. Sau go-live

- [ ] Cập nhật `PROGRESS.md`: chuyển toàn bộ mục "Nợ kỹ thuật" liên quan (backfill/Edge Function
      "chưa chạy thật") sang "Đã xong" kèm bằng chứng (ngày, ảnh chụp/kết quả `curl`, ID
      `ingest_runs`).
- [ ] Cân nhắc mở lại Đợt 17 (alerts, `docs/plans/xgold-tradingview-parity-plan.md`) — điều kiện
      chặn ("deploy Supabase thật") nay đã xong.
