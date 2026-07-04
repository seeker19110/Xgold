# Kế hoạch phát triển toàn diện Xgold — sau MVP

> **Trạng thái: ĐỀ XUẤT — chờ người dùng chốt** (xem mục 6). Lập ngày 2026-07-04 theo `/consult`
> (brownfield): rà soát kế hoạch MVP `xgold-mvp-plan.md` đối chiếu thực tế, rồi lên lộ trình kế tiếp.
> Trọng tâm yêu cầu mới: **indicator kết hợp phân tích và gợi ý mua/bán** (mục 4 — ghi chú phát
> triển chi tiết). Mọi phiên bản trong tài liệu này đã xác minh nguồn sống ngày 2026-07-04.

## 1. Rà soát kế hoạch MVP hiện có (đối chiếu kế hoạch ↔ thực tế)

Nguồn đối chiếu: `docs/plans/xgold-mvp-plan.md` mục 3/6, `PROGRESS.md`, `docs/FEATURE-MAP.md`,
lịch sử merge trên `main` (PR #1–#15, release 1.1.0).

| Hạng mục kế hoạch MVP                       | Kết quả thực tế                                                                            | Đánh giá                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Đợt 0–4 (bootstrap → hoàn thiện MVP)        | Xong, 5 cổng xanh, 32/32 E2E, Lighthouse 1.0, vòng `/completion` đã đóng (0 phát hiện Cao) | ✅ khớp                                        |
| Đợt 5 Should (vàng trong nước + freshness)  | Xong (BTMC + fallback vang.today, ADR-0005/0006)                                           | ✅ vượt kế hoạch (thêm nguồn dự phòng)         |
| Must #1 — ingest chạy tự động 24h không lỗi | Code + README xong; **chưa kiểm chứng thật** (sandbox chặn mạng, không Deno/Docker)        | 🚧 FT-09/10/11 — chỉ đóng được khi deploy thật |
| Sentry (Đợt 4)                              | Hoãn có chủ đích (cần DSN thật, không cắm mù)                                              | ➖ nợ kỹ thuật đã ghi                          |
| i18n / PWA                                  | Người dùng chốt 2026-07-04: i18n tiếp tục hoãn; PWA chỉ làm icon tối thiểu (chờ ảnh thật)  | ➖ phạm vi đã khóa, không tự mở lại            |
| Won't have MVP: tài khoản, alerts, vẽ chart | Đúng như kế hoạch — chưa làm                                                               | ✅ khớp                                        |

**Kết luận rà soát:** kế hoạch MVP không còn mục nào "đang mở" làm được trong sandbox — phần còn
lại (deploy Supabase thật, backfill, bật pg_cron, đối chiếu field BTMC) **bắt buộc cần người dùng
thao tác ngoài sandbox**. Kế hoạch MVP giữ nguyên giá trị tham chiếu (stack, ADR 0001–0006 đều còn
đúng); tài liệu này là **bản kế tiếp**, không thay thế.

**Việc gối đầu (carry-over) — không thuộc đợt mới nào, xử lý khi có điều kiện:**

1. Deploy thật: Supabase project + `TWELVEDATA_API_KEY` + `npm run backfill` + test Edge Function
   bằng curl **trước khi** bật pg_cron (README trong `supabase/functions/*/`). Chặn bởi: người dùng.
2. Icon PWA 192/512 (F-008) — chờ ảnh thật từ người dùng.
3. Sentry — chờ DSN thật.
4. PR #9 (release 1.0.1) kẹt `action_required` — chủ repo bấm "Approve and run" (đã có release
   1.1.0 qua PR #14 nên mức độ chỉ còn là dọn dẹp).

## 2. Ba hướng phát triển kế tiếp

| Hướng | Nội dung                                                                                      | Làm được trong sandbox?                      |
| ----- | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **A** | Vận hành thật (mục 1 — carry-over): deploy, kiểm chứng ingestion, nối DB thật                 | ❌ cần người dùng                            |
| **B** | **Indicator mở rộng + phân tích kết hợp + gợi ý mua/bán** (yêu cầu mới — trọng tâm)           | ✅ trọn vẹn (fixture + unit + E2E như Đợt 3) |
| **C** | Backlog cũ: thêm symbol (XAG/DXY/USDVND), export CSV, so sánh SJC vs thế giới quy đổi, alerts | ✅ một phần (alerts cần deploy thật)         |

Đề xuất: **đi hướng B ngay** (đúng yêu cầu mới, cùng pattern Đợt 3 đã chạy tốt), hướng A song song
khi người dùng sẵn sàng, hướng C xếp sau B vì gợi ý mua/bán làm nền cho alerts sau này.

## 3. Lựa chọn công nghệ cho hướng B (research-first, xác minh 2026-07-04)

Câu hỏi duy nhất phải quyết: **tự viết tiếp pure TS hay dùng thư viện chỉ báo/tín hiệu?**

| Tiêu chí                                    | Tự viết `lib/indicators` + `lib/analysis`                                                       | trading-signals 7.4.3                       | indicatorts 2.2.2         | technicalindicators 3.1.0       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------- | ------------------------------- |
| Còn được bảo trì (npm, xác minh 2026-07-04) | — (code của mình)                                                                               | ✅ cập nhật 2026-01                         | ⚠️ bản cuối 2025-02       | ❌ bản cuối 2023-07 — loại      |
| Khớp hạ tầng sẵn có                         | ✅ SMA/EMA/RSI đã có, 23 test tính tay                                                          | ❌ trùng lặp — 2 nguồn sự thật cùng chỉ báo | ❌ như bên                | ❌ như bên                      |
| Logic "kết hợp + gợi ý mua/bán"             | ✅ tự chủ hoàn toàn (đằng nào cũng phải viết — không lib nào cho sẵn luật tổng hợp theo ý mình) | ⚠️ chỉ có chỉ báo + vài helper cross        | ⚠️ có strategy nhưng cứng | ❌                              |
| Kiểm chứng được (chống ảo giác)             | ✅ test giá trị tính tay như Đợt 3                                                              | ⚠️ tin kết quả lib                          | ⚠️                        | ❌                              |
| **Kết luận**                                | **CHỌN — nhất quán quyết định Đợt 3**                                                           | Không (thêm dep không thêm giá trị)         | Không                     | Không (đã loại từ kế hoạch MVP) |

→ **Không thêm dependency mới.** MACD/Bollinger Bands là toán thuần (vài chục dòng mỗi cái), engine
phân tích là domain logic của Xgold. Khi người dùng chốt → ghi **ADR-0007** (mở rộng ADR-0002/kế
hoạch MVP mục 4 dòng "Indicator").

## 4. GHI CHÚ PHÁT TRIỂN — Indicator kết hợp phân tích & gợi ý mua/bán

### 4.1 Mục tiêu & nguyên tắc thiết kế

- Từ dữ liệu nến + các chỉ báo, **tổng hợp tín hiệu kỹ thuật** thành một đánh giá: **Mua / Bán /
  Trung lập** kèm **độ mạnh** và **danh sách lý do** (từng quy tắc đóng góp gì).
- **Rule-based, tất định, giải thích được** — KHÔNG ML, KHÔNG hộp đen ở v1. Mỗi gợi ý truy ngược
  được về quy tắc + giá trị chỉ báo cụ thể → unit test bằng giá trị tính tay được (chuẩn Đợt 3).
- **Chỉ dùng nến đã đóng** — tín hiệu không "repaint" (không đổi ngược quá khứ khi nến đang chạy).
- **Pháp lý (KHUNG-3 PHẦN A — bắt buộc):** đây là **tín hiệu kỹ thuật tham khảo**, không phải lời
  khuyên đầu tư. Disclaimer cố định ngay cạnh khối gợi ý; wording dùng "tín hiệu kỹ thuật", tránh
  "khuyến nghị/lệnh"; v1 **không** hiển thị điểm vào lệnh/cắt lỗ/chốt lời.

### 4.2 Chỉ báo mới cần thêm (tiền đề của engine)

Cùng chuẩn `lib/indicators/` hiện có (pure TS, `IndicatorPoint` với `value: null` vùng khởi động,
test giá trị tính tay, quy ước khớp TradingView):

| Chỉ báo             | Định nghĩa (quy ước TradingView)                                               | File dự kiến                  |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| **MACD**            | MACD line = EMA(12) − EMA(26); Signal = EMA(9) của MACD line; Histogram = hiệu | `lib/indicators/macd.ts`      |
| **Bollinger Bands** | Basis = SMA(20); Upper/Lower = Basis ± 2 × độ lệch chuẩn (population, ddof=0)  | `lib/indicators/bollinger.ts` |

(Stochastic để backlog — không cần cho bộ quy tắc v1, tránh phình phạm vi.)

### 4.3 Kiến trúc module

```
lib/analysis/
  types.ts      — RuleSignal { ruleId, direction: 'buy'|'sell'|'neutral', weight, reason, ts }
                  Suggestion { direction, score (−1..+1), signals: RuleSignal[] }
  rules/        — mỗi quy tắc 1 file, 1 pure function (candles, indicators) → RuleSignal[]
    ma-cross.ts, price-vs-ma.ts, rsi-zone.ts, macd-cross.ts, bb-touch.ts
  combine.ts    — tổng hợp có trọng số → Suggestion (ngưỡng phân loại Mua/Bán/Trung lập)
  config.ts     — Zod schema bộ quy tắc + trọng số (bật/tắt từng rule), default; nối vào
                  ChartConfig hiện có (mã hóa URL/localStorage tái dùng lib/indicators/config.ts)

components/chart/
  analysis-panel.tsx — thẻ gợi ý: hướng + độ mạnh + lý do từng rule + disclaimer; 4 trạng thái UI
  gold-chart.tsx     — thêm markers điểm tín hiệu trên nến (lightweight-charts v5:
                       createSeriesMarkers — xác nhận API tồn tại trong bản 5.2.0 đã cài trước khi dùng)
```

- Tính **client-side** từ candles đã fetch (cùng chỗ với Multi-MA/RSI) — không cần bảng DB mới,
  không đụng schema, hoạt động cả ở chế độ dữ liệu mẫu.
- Mọi hàm trong `lib/analysis/` là pure function → unit test không cần mock.

### 4.4 Bộ quy tắc v1 (đề xuất — người dùng chốt/chỉnh ở mục 6)

| ID  | Quy tắc             | Điều kiện Mua (Bán đối xứng)                                             | Trọng số mặc định |
| --- | ------------------- | ------------------------------------------------------------------------ | ----------------- |
| R1  | MA cross            | Golden cross: MA nhanh (50) cắt LÊN MA chậm (200) trong N nến gần nhất   | 0.30              |
| R2  | Xu hướng nền        | Giá đóng cửa trên MA(200) → thiên Mua (lọc xu hướng, không tự phát lệnh) | 0.15              |
| R3  | RSI vùng            | RSI(14) < 30 → quá bán (thiên Mua); > 70 → quá mua (thiên Bán)           | 0.20              |
| R4  | MACD cross          | MACD line cắt LÊN Signal line; histogram đổi dấu − → + củng cố           | 0.25              |
| R5  | Bollinger chạm băng | Giá chạm/đâm băng dưới → thiên Mua (mean-reversion); băng trên → Bán     | 0.10              |

- `score = Σ(direction × weight)` trên các rule đang bật; **Mua** nếu score ≥ +0.25, **Bán** nếu
  ≤ −0.25, còn lại **Trung lập** (ngưỡng nằm trong config, có test).
- Rule thiếu dữ liệu (vùng khởi động `null`) → trả `neutral` weight 0, KHÔNG đoán — hiển thị
  "chưa đủ dữ liệu" trong lý do.
- Tín hiệu tính theo **timeframe đang xem**; đổi khung → tính lại (ghi rõ trên UI "tín hiệu theo
  khung 1h/4h/1D/1W đang chọn" để tránh hiểu nhầm).

### 4.5 Chống lỗi logic (CLAUDE.md §3 mục 6 — rà trước khi code)

- **Ca biên từng rule:** chuỗi ngắn hơn chu kỳ (toàn null), giá đứng yên (RSI 50, MACD 0, BB width
  0 — chia cho σ=0 phải xử lý), cross đúng tại nến biên, hai cross liên tiếp ngược chiều.
- **Không nhìn tương lai (look-ahead):** rule chỉ được đọc nến ≤ ts đang xét; test bằng cách cắt
  mảng và so kết quả từng điểm.
- **Trùng lặp tính toán:** MACD dùng lại `ema()` sẵn có, BB dùng lại `sma()` — không chép công thức.
- **Resample:** tín hiệu trên 4h/1W tính từ nến resample (đã test ranh giới ở Đợt 1) — thêm 1 test
  tổ hợp resample→indicator→rule.

### 4.6 Tiêu chí chấp nhận (điền `PROJECT.md` khi chốt)

1. MACD/BB có unit test giá trị tính tay, khớp quy ước TradingView (sai số < 0.01%).
2. Mỗi rule ≥ 3 unit test (Mua/Bán/ca biên); `combine` có test ngưỡng + test thiếu dữ liệu.
3. Trang chart hiển thị khối gợi ý (hướng + độ mạnh + lý do + disclaimer) đủ 4 trạng thái UI,
   AA cả Dark blue + Light, mobile-first, axe 0 vi phạm.
4. Cấu hình rule (bật/tắt, trọng số) lưu URL/localStorage như indicator hiện có; URL chia sẻ
   khôi phục đúng.
5. E2E: mở chart thấy gợi ý; tắt hết rule → khối gợi ý về trạng thái rỗng hợp lệ; đổi timeframe
   → gợi ý cập nhật.
6. Không thêm dependency runtime mới; 5 cổng + coverage ≥ 70% giữ nguyên.

### 4.7 Rủi ro riêng của tính năng

| Rủi ro                                                      | Mức   | Giảm thiểu                                                                                                                      |
| ----------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| Người dùng hiểu gợi ý là khuyến nghị đầu tư                 | Cao   | Disclaimer cố định + wording "tín hiệu kỹ thuật" + không hiển thị entry/SL/TP                                                   |
| Bộ quy tắc "nghe hợp lý" nhưng chưa kiểm chứng trên lịch sử | Trung | Đợt 8 (tùy chọn): backtest tối thiểu trên dữ liệu daily lịch sử để đo tần suất/độ trễ tín hiệu — chỉ mô tả, không hứa lợi nhuận |
| Markers API v5 khác tài liệu nhớ trong đầu                  | Thấp  | Prototype `createSeriesMarkers` ngay đầu đợt trên bản 5.2.0 đã cài (chống ảo giác §4)                                           |

## 5. Lộ trình đợt đề xuất (mỗi đợt = 1 nhánh + 1 PR qua `/gate`, giữ FIFO)

| Đợt                                  | Nội dung                                                                                                          | Cổng ra (DoD của đợt)                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **6. Chỉ báo mở rộng**               | `macd.ts` + `bollinger.ts` + vẽ lên chart (MACD pane phụ, BB overlay) + panel cấu hình mở rộng                    | Unit test tính tay xanh; E2E thêm/ẩn chỉ báo mới; 5 cổng xanh                     |
| **7. Engine phân tích + gợi ý**      | `lib/analysis/` (rules + combine + config) + `analysis-panel.tsx` + markers + disclaimer                          | Tiêu chí 4.6 đạt đủ; kiểm chứng thật bằng trình duyệt (chuẩn Đợt 2/3)             |
| **8. (Tùy chọn) Backtest tối thiểu** | Script/trang thống kê tín hiệu lịch sử (số lần, phân bố theo năm) — kiểm chứng rule, không phải công cụ giao dịch | Số liệu tái lập được từ fixture; không hứa hẹn hiệu suất                          |
| **A (song song, ngoài sandbox)**     | Carry-over mục 1: deploy Supabase + backfill + kiểm chứng ingestion + icon PWA + Sentry                           | Checklist README từng Edge Function hoàn tất; FT-09/10/11 chuyển ✅ ở FEATURE-MAP |

Sau đó (backlog giữ nguyên thứ tự cũ): alerts (cần hạ tầng thật + nền tảng là engine Đợt 7),
thêm symbol, export CSV, so sánh SJC vs thế giới quy đổi.

## 6. Cần người dùng chốt gì

1. **Hướng đi:** đồng ý làm Đợt 6–7 (indicator kết hợp + gợi ý mua/bán) trước, hướng A song song
   khi bạn sẵn sàng deploy? (đề xuất: có)
2. **Công nghệ:** tự viết pure TS, không thêm dependency (mục 3) → sẽ ghi ADR-0007? (đề xuất: có)
3. **Bộ quy tắc v1 + trọng số** (mục 4.4): dùng 5 rule R1–R5 với trọng số mặc định như trên, hay
   bạn muốn thêm/bớt/chỉnh (vd cặp MA cross 50/200 hay 20/50)?
4. **Phạm vi UI:** chỉ khối gợi ý + markers + disclaimer, KHÔNG entry/SL/TP ở v1? (đề xuất: có —
   ranh giới pháp lý/UX ở 4.1)
5. **Đợt 8 backtest** có nằm trong phạm vi đợt này không, hay để backlog? (đề xuất: làm ngay sau
   Đợt 7 vì là bằng chứng thật cho chất lượng rule)
