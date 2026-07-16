# Đặc tả chi tiết — Toàn bộ phần còn lại của Xgold (sau Đợt 13)

> Bức tranh đầy đủ những gì CÒN LẠI của dự án, viết thành đặc tả chi tiết để thực thi lần lượt.
> Nguồn: `PROGRESS.md` mục "Tiếp theo" + "Nợ kỹ thuật", ADR-0003/0005/0009/0010, README 2 Edge
> Function. Đợt 13 (chart ratio + panel cấu hình + export CSV) đã có đặc tả riêng ở
> `xgold-batch13-plan.md` — file này nối tiếp từ đó.
>
> **Tổng quan còn lại, theo thứ tự phụ thuộc:**
>
> | Đợt | Nội dung                                                      | Chặn bởi                         | Làm được trong sandbox?                                          |
> | --- | ------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
> | 13  | Chart ratio + panel cấu hình + CSV                            | —                                | ✅ (đặc tả riêng)                                                |
> | 14  | Deploy hạ tầng thật (Supabase + hosting) + field verification | Người dùng tạo tài khoản/project | ❌ — runbook cho người dùng + AI hỗ trợ từng bước                |
> | 15  | Alert đẩy thông báo                                           | Đợt 14 xong (cần pg_cron thật)   | Code + test được trong sandbox; kiểm chứng cuối cần hạ tầng thật |
> | 16  | Hoàn tất nợ chờ đầu vào: icon PWA, Sentry, SJC, i18n          | Đầu vào từ người dùng            | Một phần                                                         |

---

## ĐỢT 14 — Deploy hạ tầng thật + field verification (runbook chi tiết)

### 14.0 Bối cảnh

Toàn bộ code ingestion đã viết xong và unit-test bằng fixture (Đợt 1–5, 9), nhưng **chưa từng chạy
với dịch vụ thật** (mạng sandbox chặn, không có Deno/Docker — `PROGRESS.md` "Nợ kỹ thuật"). Đợt 14
không viết tính năng mới — là **vận hành + kiểm chứng**, đi đúng trình tự dưới đây. Sai trình tự có
rủi ro thật (vd bật `pg_cron` trước khi field-verify → ghi dữ liệu sai vào `candles` định kỳ).

### 14.1 Điều kiện tiên quyết (người dùng chuẩn bị, AI không tự làm được)

1. Tài khoản Supabase + tạo project (khuyến nghị region `ap-southeast-1` Singapore — gần người dùng
   Việt Nam nhất trong các region Supabase hiện có; xác nhận lại danh sách region lúc tạo).
2. API key Twelve Data (đăng ký free tier tại twelvedata.com — đủ cho tần suất 1 lần/giờ × 4 mã,
   xác nhận lại hạn mức free tier tại thời điểm đăng ký vì có thể đã đổi).
3. Tài khoản hosting cho Next.js (khuyến nghị Vercel — ADR-0001; free tier Hobby đủ cho giai đoạn
   này).
4. Quyết định: có tạo **project staging riêng** không? Khuyến nghị: **có** (free tier Supabase cho
   2 project) — migration test trên staging trước, prod sau. Nếu người dùng muốn tối giản: 1 project
   duy nhất cũng chấp nhận được ở quy mô hiện tại, ghi rõ đánh đổi (lỗi migration đập thẳng prod).

### 14.2 Trình tự bắt buộc (mỗi bước có tiêu chí đạt trước khi sang bước sau)

**Bước 1 — Link project + áp migration:**

```bash
npx supabase link --project-ref <ref>
npx supabase db push          # áp 5 migration theo thứ tự timestamp
```

- Tiêu chí đạt: Supabase Studio thấy đủ bảng (`instruments`, `candles`, `ingest_runs`,
  `domestic_gold_prices`), seed `instruments` đủ 4 mã, RLS đang bật.
- **Kiểm tra RLS trên nền tảng thật** (nợ kỹ thuật đã ghi: mới test bằng Postgres 16 giả lập):
  dùng anon key gọi thử `select` (phải được) và `insert` vào `candles` (phải bị chặn). Nếu khác kỳ
  vọng → dừng, đối chiếu default privileges của Supabase thật với migration.

**Bước 2 — Sinh lại types từ schema thật:**

```bash
npx supabase gen types typescript --linked > lib/supabase/database.types.ts
```

- Đối chiếu diff với bản viết tay hiện có: chỉ được khác về format/comment, **không được khác về
  cấu trúc cột**. Khác cấu trúc → migration hoặc bản viết tay có lỗi, điều tra trước khi tiếp.
- Chạy `npm run type-check` — phải xanh. Commit riêng (`chore: sinh database.types từ schema thật`).

**Bước 3 — Deploy + field-verify Edge Function `ingest-gold` (làm theo README trong thư mục, tóm tắt):**

```bash
npx supabase secrets set TWELVEDATA_API_KEY=<key>
npx supabase functions deploy ingest-gold
curl -i -X POST 'https://<ref>.supabase.co/functions/v1/ingest-gold' -H "Authorization: Bearer <service-role-key>"
```

- Tiêu chí đạt: `results` có `status: "success"` cho từng mã × từng khung; bảng `candles` có dữ
  liệu; gọi lại lần 2 **không** sinh bản ghi trùng (upsert idempotent).
- **Field-verification riêng cho DXY + USD/VND (BẮT BUỘC — ADR-0009, độ tin cậy mã thấp):** kiểm
  giá trị trả về nằm trong dải hợp lý (DXY ~95–110 điểm; USD/VND ~24.000–27.000). Sai dải/sai đơn
  vị → mã Twelve Data sai loại tài sản: sửa `twelveDataSymbol` trong mảng `INSTRUMENTS` của
  `index.ts`, thử lại; nếu không tìm được mã đúng → **tắt 2 mã này khỏi ingestion** (giữ fixture)
  và ghi ADR cập nhật, KHÔNG để dữ liệu sai vào DB.

**Bước 4 — Deploy + field-verify `ingest-domestic-gold` (BTMC XML — nợ Đợt 5):**

- Theo README trong `supabase/functions/ingest-domestic-gold/`: curl endpoint BTMC thật, đối chiếu
  **tên field XML thật** với parser (viết theo tài liệu gián tiếp, chưa từng thấy response thật —
  ADR-0005/0006). Field khác → sửa parser + unit test fixture theo response thật, rồi deploy lại.
- Tiêu chí đạt: bảng `domestic_gold_prices` có bản ghi mới đúng đơn vị (VND/lượng, dải hợp lý
  ~75–130 triệu — đối chiếu giá thị trường lúc test).

**Bước 5 — Backfill lịch sử:**

```bash
npm run backfill    # Stooq 1D cho XAU/XAG (DXY/USDVND chưa có ticker Stooq xác nhận — bỏ qua, đã ghi ADR-0009)
```

- Tiêu chí đạt: `candles` khung 1D có lịch sử dài (nhiều năm); spot-check 3–5 ngày bất kỳ so với
  nguồn công khai (vd đồ thị vàng trên trang tài chính lớn) — lệch lớn → điều tra parser/timezone.

**Bước 6 — Bật lịch pg_cron (CHỈ sau khi Bước 3+4 đạt):** chạy SQL trong README từng function.
Tiêu chí đạt: sau 2 chu kỳ, `ingest_runs` có bản ghi định kỳ `success`, `candles` có nến mới.

**Bước 7 — Deploy Next.js lên hosting:**

- Đặt env theo `lib/env.ts` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SITE_URL` = domain thật, `SUPABASE_SERVICE_ROLE_KEY` nếu route server cần).
- Tiêu chí đạt: trang production hiển thị **dữ liệu thật từ Supabase** (không còn nhãn "dữ liệu
  mẫu"); đủ luồng chính: chart 4 mã, screener, so sánh giá vàng, đổi theme; chạy Lighthouse trên
  URL thật (ngân sách CWV như CLAUDE.md §3.9).

### 14.3 Ranh giới & rủi ro

- **Không sửa logic tính toán** trong đợt này — chỉ sửa adapter (mã provider, parser field) khi
  field-verification phát hiện lệch, mỗi sửa có unit test fixture cập nhật theo response thật.
- Rủi ro chính: mã provider sai loại tài sản (âm thầm — Zod không bắt được vì shape đúng). Phòng bị
  bằng kiểm tra dải giá trị ở Bước 3/4 (đã ghi ở trên).
- Secrets chỉ đặt qua `supabase secrets` / dashboard hosting — không bao giờ vào repo (CLAUDE.md §3.5).

---

## ĐỢT 15 — Alert đẩy thông báo (đặc tả thiết kế + kế hoạch code)

### 15.0 Vấn đề

Người dùng phải mở trang mới biết tín hiệu đổi. Cần: **định kỳ kiểm tra điều kiện tín hiệu → gửi
thông báo** khi điều kiện thoả. Nền đã có: engine `lib/analysis/` (suggestLatest, computeConfluence),
dữ liệu nến định kỳ trong DB (sau Đợt 14).

### 15.1 Quyết định thiết kế 1 — kênh thông báo (cần người dùng chốt)

| Phương án                            | Ưu                                                                                       | Nhược                                                                                                                                                | Đề xuất                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **A. Email (qua Resend hoặc SMTP)**  | Đơn giản nhất; không cần service worker; free tier Resend 100 email/ngày đủ dùng cá nhân | Trễ hơn push; cần API key dịch vụ email                                                                                                              | **✅ v1**                             |
| B. Web Push (VAPID + service worker) | Đến thẳng thiết bị                                                                       | Dự án đã **chủ động không có service worker** (quyết định PWA tối thiểu 2026-07-04 — thêm SW là lật lại quyết định đó); iOS web push yêu cầu cài PWA | v2 nếu cần                            |
| C. Telegram bot                      | Nhanh, miễn phí, người dùng VN quen                                                      | Phụ thuộc nền tảng thứ 3; cần người dùng tạo bot + chat id                                                                                           | Thay thế ngang A nếu người dùng thích |

**Đề xuất: A (email) hoặc C (Telegram) — người dùng chọn theo thói quen.** B để sau vì mâu thuẫn
quyết định PWA tối thiểu đã chốt.

### 15.2 Quyết định thiết kế 2 — nơi chạy logic kiểm tra

Vấn đề đã biết: engine phân tích là TypeScript trong `lib/analysis/` với path alias `@/…` — Edge
Function (Deno) **không import trực tiếp được** (cùng vấn đề mảng `INSTRUMENTS` phải đồng bộ tay).
Hai phương án:

| Phương án                                                                                           | Cách làm                                                                                    | Ưu / Nhược                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Route handler Next.js `/api/cron/check-alerts` + pg_cron gọi qua `pg_net`** (hoặc Vercel Cron) | Engine chạy ngay trong app Next — **import trực tiếp `lib/analysis/`, không nhân bản code** | Ưu: một nguồn sự thật cho logic phân tích (nguyên tắc DRY §3.4 — quyết định then chốt). Nhược: cần bảo vệ route bằng secret header (`CRON_SECRET`)                                    |
| B. Edge Function Deno riêng                                                                         | Chạy cạnh DB                                                                                | Nhược nặng: phải **nhân bản engine phân tích sang Deno** và đồng bộ tay mãi mãi — đúng loại nợ đã than phiền với `INSTRUMENTS`, nhưng tệ hơn nhiều (logic phức tạp thay vì mảng hằng) |

**Đề xuất: A.** Đây là quyết định kiến trúc đáng ADR (`docs/adr/0013-alerts-architecture.md`).

### 15.3 Mô hình dữ liệu (migration mới — cần người dùng duyệt vì đổi schema)

```sql
-- alert_rules: điều kiện người dùng đặt (v1 chưa có auth → không có user_id;
-- bảng cấu hình đơn giản do chủ dự án quản lý, RLS: chỉ service_role ghi/đọc)
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  symbol text not null references instruments(symbol),
  kind text not null check (kind in ('signal_change', 'confluence_threshold', 'price_cross')),
  params jsonb not null,          -- vd {"threshold": 0.5} hoặc {"price": 3400, "direction": "above"}
  channel text not null check (channel in ('email', 'telegram')),
  target text not null,           -- địa chỉ email hoặc chat id
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- alert_events: lịch sử đã gửi (chống gửi lặp — idempotency, CLAUDE.md §3.6)
create table alert_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references alert_rules(id),
  fired_at timestamptz not null default now(),
  dedupe_key text not null,       -- vd "XAUUSD:signal_change:buy:2026-07-16" — unique chặn gửi trùng
  payload jsonb not null,
  unique (rule_id, dedupe_key)
);
```

- **Chống gửi lặp là yêu cầu lõi:** cron chạy mỗi giờ, tín hiệu "Mua" giữ nguyên nhiều giờ liền →
  chỉ gửi khi **đổi trạng thái** (`signal_change`) hoặc khi `dedupe_key` chưa tồn tại. Insert
  `alert_events` với `unique` constraint TRƯỚC khi gửi; gửi lỗi → xoá bản ghi để lần sau thử lại
  (hoặc cột `status` pending→sent — chọn lúc code, ghi rõ trong PR).

### 15.4 Luồng xử lý (route `/api/cron/check-alerts`)

1. Xác thực header `Authorization: Bearer ${CRON_SECRET}` (env mới trong `lib/env.ts`, bắt buộc khi
   route này hoạt động) — sai/thiếu → 401, không lộ thông tin.
2. Đọc `alert_rules` enabled; group theo symbol để fetch nến 1 lần/mã (1h + 1D như `use-confluence`).
3. Với mỗi rule: chạy đánh giá theo `kind` — tái dùng `suggestLatest` / `computeConfluence` /
   so sánh giá đóng cửa. Tính `dedupe_key`; đã tồn tại → bỏ qua.
4. Gửi qua channel (module `lib/alerts/senders/{email,telegram}.ts` — interface chung
   `send(target, message): Promise<void>`, dễ thêm kênh sau). Nội dung tiếng Việt, có disclaimer
   (tái dùng chuỗi của `analysis-disclaimer` — không chép).
5. Trả JSON tổng kết `{checked, fired, errors}` — ghi vào log (và `ingest_runs`-style bảng riêng
   nếu cần sau, v1 log là đủ).

### 15.5 Kiểm thử

- Unit (mock fetch/DB): đánh giá từng `kind` với nến fixture (đổi tín hiệu → fire; giữ nguyên →
  không fire; dedupe chặn lần 2); route 401 khi thiếu secret; 1 rule lỗi không chặn rule khác
  (pattern `use-screener` đã có).
- Integration cục bộ: chạy route bằng `curl` với Supabase local hoặc mock — kiểm luồng đủ.
- Kiểm chứng thật (sau Đợt 14): tạo 1 rule thật, hạ ngưỡng để chắc chắn fire, xác nhận nhận được
  email/Telegram thật, xác nhận chạy lại không gửi trùng. **Chưa đạt bước này thì tính năng chưa
  được coi là xong.**
- UI quản lý rule: **v1 KHÔNG làm UI** — rule đặt bằng SQL/Studio (số lượng người dùng = chủ dự
  án). UI CRUD rule là v2 (cần cân nhắc auth trước — không để endpoint ghi rule công khai).

### 15.6 Ranh giới

- KHÔNG auth/multi-user. KHÔNG web push/service worker. KHÔNG UI quản lý rule. KHÔNG ML/dự đoán.
- Email/Telegram credential qua env (`RESEND_API_KEY` / `TELEGRAM_BOT_TOKEN` optional trong
  `lib/env.ts`, cùng pattern `SENTRY_DSN` sẵn có).

---

## ĐỢT 16 — Nợ chờ đầu vào người dùng (đặc tả từng hạng mục)

### 16.1 F-008 — Icon PWA (chờ: 2 file ảnh thật)

- Người dùng cung cấp `icon-192.png` + `icon-512.png` (AI không tự tạo ảnh giả — CLAUDE.md §4);
  đặt vào `public/`, xác nhận `app/manifest.ts` hợp lệ bằng Lighthouse PWA audit + tab
  Application của DevTools. Không thêm service worker (quyết định giữ nguyên).

### 16.2 Sentry (chờ: DSN thật)

- Khi có tài khoản: `npm install @sentry/nextjs` (xác minh phiên bản mới nhất lúc cài — không ghi
  cứng ở đây vì sẽ lỗi thời), chạy wizard hoặc cấu hình tay theo
  `docs/framework/quality-supplements.md` PHẦN 4; `SENTRY_DSN` đã có field optional trong
  `lib/env.ts`. Kiểm chứng: ném lỗi thử ở route dev-only, thấy event trên dashboard Sentry thật
  rồi mới coi là xong. Tránh bật `tracesSampleRate` cao (chi phí) — bắt đầu 0.1.

### 16.3 SJC làm nguồn giá trong nước bổ sung (ADR-0005 — hoãn có chủ đích)

- Điều kiện mở lại: xác nhận được endpoint SJC ổn định (ADR-0005 ghi lý do hoãn: không có API công
  khai ổn định, chỉ scraping HTML rủi ro cao). Nếu mở lại: viết provider mới theo pattern
  `lib/providers/` + fixture từ response thật + field-verification như Đợt 14 Bước 4. **Không làm
  cho tới khi có bằng chứng endpoint ổn định** — BTMC + vang.today (ADR-0006) đang đủ dùng.

### 16.4 i18n (hoãn theo quyết định người dùng 2026-07-04)

- Giữ nguyên UI tiếng Việt cứng. Chỉ mở lại khi người dùng nêu nhu cầu thật (khách ngoại ngữ).
  Không tự ý làm.

---

## Thứ tự thực thi tổng & điều kiện chuyển đợt

1. **Đợt 13** (sandbox, 3 PR) → điều kiện ra như `xgold-batch13-plan.md` mục 7.
2. **Đợt 14** (cần người dùng — runbook 14.2, AI hỗ trợ từng bước, kết quả từng bước dán lại để AI
   đối chiếu tiêu chí đạt) → điều kiện ra: production chạy dữ liệu thật, pg_cron chạy ổn ≥ 2 chu kỳ,
   field-verification 4 mã + BTMC đạt.
3. **Đợt 15** (code trong sandbox được ngay sau khi người dùng chốt 15.1/15.2 + duyệt migration
   15.3; kiểm chứng cuối sau Đợt 14) → điều kiện ra: nhận thông báo thật, không gửi trùng.
4. **Đợt 16** rải rác theo đầu vào người dùng, không chặn các đợt khác.

## Cần người dùng chốt gì (toàn lộ trình)

1. **Đợt 13:** 3 câu hỏi ở `xgold-batch13-plan.md` mục 9.
2. **Đợt 14:** có làm staging project riêng không (14.1.4)? Khi nào bắt đầu (cần bạn tạo tài
   khoản/project — AI không tự làm được bước này)?
3. **Đợt 15:** kênh thông báo v1 — **email (Resend)** hay **Telegram**? Xác nhận kiến trúc route
   Next.js + pg_net (15.2, đề xuất A)? Duyệt migration 2 bảng mới (15.3 — đổi schema, thuộc diện
   "dừng và hỏi" §9)?
4. **Đợt 16:** gửi 2 file icon khi sẵn sàng; tạo tài khoản Sentry nếu muốn observability production.
