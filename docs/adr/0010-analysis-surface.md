# ADR-0010: Bề mặt phân tích (MTF confluence + Screener + Ratio/Correlation) — tái dùng engine, pure TS

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-13
- **Liên quan:** ADR-0007 (engine phân tích pure TS), ADR-0008 (registry đa mã),
  ADR-0002 (lightweight-charts); đặc tả `docs/plans/xgold-analysis-surface-plan.md`
  (người dùng chốt hướng "Đợt 10: A+B+C", giữ ranh giới pháp lý Đợt 7 — 2026-07-13)

## Bối cảnh

Sau Đợt 6–9, Xgold đã có **engine phân tích pure-TS symbol-agnostic** (`lib/analysis/`) + **registry
đa mã** (`lib/instruments.ts`) + render **client-side**, nhưng chỉ khai thác ở mức "một mã × một
khung × một lúc". Người dùng yêu cầu nghiên cứu đề xuất tính năng tiếp theo. Ba tính năng giá trị
cao nhất đều **nhân bội** tài sản sẵn có: (A) hợp lưu đa khung, (B) màn hình quét tín hiệu toàn mã,
(C) tỷ lệ Vàng/Bạc + tương quan DXY. Cần quyết cách hiện thực để không phá kiến trúc.

## Quyết định

- **Tái dùng engine + hạ tầng sẵn có, pure TS, KHÔNG thêm dependency runtime, KHÔNG đụng schema CSDL,
  KHÔNG cần deploy thật.** Tính client-side từ nến fetch qua `/api/candles` (hoạt động cả chế độ mẫu).
  - A (MTF): `lib/analysis/multi-timeframe.ts` gọi `suggestLatest` cho 1h/4h/1D/1W (4h/1W suy từ
    `resample`, chỉ fetch 1h + 1D) → tổng hợp confluence trên điểm chuẩn hoá `score/maxScore`.
  - B (Screener): trang `/quet-tin-hieu` chạy `suggestLatest` cho MỌI mã trong `INSTRUMENTS` ở một
    khung chọn được, dùng `DEFAULT_ANALYSIS_CONFIG`.
  - C (Ratio/Correlation): `lib/analysis/ratio.ts` (pure) — tỷ lệ Vàng/Bạc + Pearson XAU↔DXY; hiện
    dạng **thẻ số + diễn giải** trên trang screener (v1 không thêm chart mới).
- **Ranh giới pháp lý giữ nguyên như ADR-0007/Đợt 7:** "tín hiệu kỹ thuật tham khảo", disclaimer cố
  định dùng chung ở mọi bề mặt, **không** entry/SL/TP, không ML.

## Lý do

- Đòn bẩy cao nhất trên đúng phần đã đầu tư (engine có 32+ unit test tính tay) — rủi ro kỹ thuật thấp.
- Nhất quán ADR-0007 (không thêm lib chỉ báo/tín hiệu ngoài) và ADR-0008 (mọi mã đọc từ registry).
- Làm trọn trong sandbox theo đúng vòng Đợt 3/9 (fixture + unit tính tay + E2E + kiểm chứng trình
  duyệt), không phụ thuộc deploy Supabase thật.
- Chọn thẻ số cho C thay vì chart mới: giữ phạm vi gọn, vẫn kiểm chứng được bằng test tính tay.

## Các phương án đã cân nhắc

- **Thêm thư viện tín hiệu/đa khung ngoài (vd trading-signals):** loại — ADR-0007 đã bác vì tạo 2
  nguồn sự thật cho cùng chỉ báo; không lib nào cho sẵn logic confluence theo ý Xgold.
- **Tính MTF/screener phía server (bảng/materialized view mới):** loại ở v1 — thêm schema + phụ thuộc
  deploy thật; client-side đã đủ nhanh (nến nhẹ) và chạy được cả chế độ mẫu.
- **Ratio/correlation dạng chart đầy đủ:** hoãn — v1 thẻ số đủ giá trị, tránh phình; có thể nâng cấp
  chart ở đợt sau nếu người dùng cần.
- **Cho chỉnh cấu hình quy tắc trên screener:** hoãn — v1 dùng bộ mặc định để giảm bề mặt; MTF thì
  bám cấu hình người dùng đang đặt trên trang chart (nhất quán những gì họ thấy).

## Hệ quả

- **Tích cực:** không tăng dependency/không rủi ro schema; tái dùng test sẵn có; mở đường cho alerts
  sau này (screener + confluence là nền để chọn điều kiện cảnh báo khi có hạ tầng thật).
- **Đánh đổi/rủi ro:** screener fetch song song N mã (hiện 4) — chấp nhận được, cần hủy request cũ
  khi đổi khung; confluence thêm 2 fetch trên trang chart — đặt sau nến chính, không chặn render chart.
  Người dùng có thể hiểu nhầm tín hiệu là khuyến nghị → giảm thiểu bằng disclaimer dùng chung + wording.
- **Việc tiếp theo:** thực thi theo `docs/plans/xgold-analysis-surface-plan.md`; thêm FT-18/19/20 vào
FEATURE-MAP; khi có deploy thật, cân nhắc alerts dựa trên chính engine này.
</content>
