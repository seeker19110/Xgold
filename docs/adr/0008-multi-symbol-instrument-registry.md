# ADR-0008: Đa symbol qua registry mã + route động `/chart/[symbol]`

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-04
- **Liên quan:** ADR-0003 (nguồn dữ liệu Twelve Data + Stooq, adapter pattern), ADR-0002
  (lightweight-charts); backlog trong `docs/plans/xgold-development-plan.md` mục 5 ("thêm symbol");
  Đợt 9.

## Bối cảnh

MVP chỉ có một mã cứng XAU/USD: route `app/chart/xauusd/` hard-code, fixture chỉ XAU/USD,
`sampleBaseCandles` trả `[]` cho mã khác, seed migration một dòng, nhãn `aria-label` chart cố định
"XAU/USD". Backlog yêu cầu **thêm symbol** (XAG/USD bạc, sau này USD/VND, DXY…). Toàn bộ tầng tính
toán (indicators, engine phân tích, resample) vốn đã symbol-agnostic (nhận `Candle[]`), provider
cũng đã có `SYMBOL_MAP` — nút thắt duy nhất là các điểm hard-code XAU/USD ở tầng hiển thị/cấu hình.

## Quyết định

- **Một registry mã duy nhất** `lib/instruments.ts` (`Instrument`: symbol/slug/label/name/chartLabel/
  type/currency/sample) làm **nguồn sự thật** cho: route động, trang chủ, API `/api/candles`, sitemap,
  backfill, và (đồng bộ thủ công vì Deno không import path alias) Edge Function ingest.
- **Route động `app/chart/[symbol]/`** thay route tĩnh `xauusd`, `dynamicParams = false` +
  `generateStaticParams` từ registry → slug hợp lệ prerender (SSG), slug lạ **404 do framework**.
  `/chart/xauusd` giữ nguyên hoạt động (không phá URL cũ/E2E cũ).
- **Slug URL (chữ thường) tách khỏi symbol (CSDL, chữ hoa):** URL đẹp `/chart/xauusd`, CSDL/provider
  giữ `XAUUSD`.
- **Thêm mã mới = thêm một mục registry + một dòng seed migration + (nếu ingest) một dòng mảng Edge
  Function** — không sửa component/route.
- Mã thứ hai cụ thể ở Đợt 9: **XAG/USD (bạc)** (Twelve Data `XAG/USD`, Stooq `xagusd`).

## Lý do

- Tận dụng tối đa hạ tầng đã kiểm chứng: indicators + engine phân tích + chart + resample dùng lại
  nguyên vẹn (0 thay đổi), chỉ tổng quát hoá vài điểm hiển thị/cấu hình.
- Route động + `dynamicParams = false` cho 404 mã lạ "miễn phí" (không tự viết guard), đồng thời SSG
  giữ hiệu năng (LCP thấp) như trang tĩnh cũ.
- Registry tập trung chống trôi dữ liệu: một nơi khai báo, mọi nơi đọc — không còn hard-code rải rác.
- Cấu hình chỉ báo (URL `?cfg=` + localStorage) **dùng chung mọi mã** có chủ đích: người dùng giữ bộ
  chỉ báo ưa thích khi chuyển mã (đơn giản, đúng kỳ vọng).

## Các phương án đã cân nhắc

- **Route tĩnh song song cho từng mã** (`app/chart/xagusd/…`): lặp code, mỗi mã một cặp file — loại.
- **Query param `?symbol=`** thay path động: URL kém sạch, khó SSG/SEO per-mã — loại.
- **Thêm cả XAG + DXY + USD/VND ngay:** DXY chưa xác minh được ở Stooq, USD/VND là forex khác nhóm;
  làm một mã thật (XAG) chứng minh kiến trúc, các mã sau thành việc thêm rẻ — hoãn có chủ đích.

## Hệ quả

**Tích cực:** nền N-symbol; USD/VND (tiền đề cho "so sánh SJC vs thế giới quy đổi") và DXY thành việc
thêm 1 mục registry. Sitemap tự liệt kê mọi mã. `/chart/xauusd` không đổi hành vi.

**Đánh đổi / rủi ro phải chấp nhận:**

- **Đồng bộ thủ công registry ↔ Edge Function ingest** (Deno self-contained không import `@/…`): thêm
  mã phải nhớ cập nhật cả mảng `INSTRUMENTS` trong `supabase/functions/ingest-gold/index.ts` + seed
  migration. Đã ghi chú tường minh trong file.
- **Dữ liệu XAG/USD thật chưa kiểm chứng ingestion** (mạng sandbox chặn, không Deno/Docker) — như
  FT-09/10 của XAU/USD; chỉ đóng khi deploy thật. Trong sandbox: unit test provider + fixture mẫu +
  E2E + kiểm chứng trình duyệt thật (screenshot Dark/Light) đều xanh.
