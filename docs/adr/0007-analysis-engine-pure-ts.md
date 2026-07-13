# ADR-0007: Engine phân tích kết hợp + gợi ý mua/bán tự viết (pure TS, không thêm dependency)

- **Trạng thái:** Đã chấp nhận — riêng ranh giới "không entry/SL/TP" đã bị **lật lại bởi ADR-0011**
  (2026-07-13); phần còn lại (kiến trúc pure TS, rule-based, không ML) vẫn hiệu lực.
- **Ngày:** 2026-07-04
- **Liên quan:** ADR-0002 (lightweight-charts), quyết định Đợt 3 tự viết `lib/indicators/`;
  kế hoạch `docs/plans/xgold-development-plan.md` mục 3–4 (người dùng chốt "theo đề xuất" 2026-07-04)

## Bối cảnh

Người dùng yêu cầu tính năng **indicator kết hợp phân tích và gợi ý mua/bán**: tổng hợp nhiều tín
hiệu kỹ thuật (MA cross, RSI, MACD, Bollinger Bands) thành một đánh giá Mua/Bán/Trung lập kèm lý do.
Cần quyết: tự viết tiếp pure TS (như `lib/indicators/` Đợt 3) hay dùng thư viện ngoài.

## Quyết định

- **Tự viết toàn bộ bằng pure TS, không thêm dependency runtime:**
  - Chỉ báo mới `lib/indicators/macd.ts` + `lib/indicators/bollinger.ts` — quy ước khớp TradingView
    (MACD: EMA12−EMA26, signal EMA9, seed SMA như `ema.ts` sẵn có; BB: SMA20 ± 2σ population),
    unit test bằng giá trị tính tay (chuẩn Đợt 3).
  - Engine `lib/analysis/`: mỗi quy tắc một pure function, tổng hợp có trọng số (Zod validate cấu
    hình), tất định và giải thích được — mỗi gợi ý truy ngược về quy tắc + giá trị chỉ báo cụ thể.
- **Rule-based, KHÔNG ML** ở v1; chỉ đánh giá trên nến đã đóng (không repaint).
- **Ranh giới sản phẩm/pháp lý:** đầu ra là "tín hiệu kỹ thuật tham khảo" — disclaimer cố định cạnh
  khối gợi ý, không hiển thị điểm vào lệnh/cắt lỗ/chốt lời.

## Các phương án đã cân nhắc (phiên bản xác minh npm registry 2026-07-04)

| Tiêu chí                         | Tự viết (chọn)                      | trading-signals 7.4.3           | indicatorts 2.2.2   | technicalindicators 3.1.0 |
| -------------------------------- | ----------------------------------- | ------------------------------- | ------------------- | ------------------------- |
| Còn bảo trì                      | — (code của mình)                   | ✅ cập nhật 2026-01             | ⚠️ bản cuối 2025-02 | ❌ bản cuối 2023-07       |
| Khớp hạ tầng sẵn có              | ✅ SMA/EMA/RSI đã có, test tính tay | ❌ 2 nguồn sự thật cùng chỉ báo | ❌ như bên          | ❌ như bên                |
| Logic tổng hợp gợi ý theo ý mình | ✅ (đằng nào cũng phải tự viết)     | ⚠️ chỉ chỉ báo + helper cross   | ⚠️ strategy cứng    | ❌                        |
| Kiểm chứng được (chống ảo giác)  | ✅ giá trị tính tay                 | ⚠️ tin kết quả lib              | ⚠️                  | ❌                        |
| **Kết luận**                     | **CHỌN**                            | Không                           | Không               | Không                     |

## Lý do

- Logic "kết hợp + gợi ý" là domain logic của Xgold — không thư viện nào cung cấp sẵn bộ quy tắc
  tổng hợp theo ý người dùng; phần thư viện cho được (chỉ báo) thì `lib/indicators/` đã có với 23
  unit test giá trị tính tay.
- Thêm dependency chỉ tạo ra 2 nguồn sự thật cho cùng một chỉ báo (nguy cơ lệch giá trị giữa chart
  và engine) mà không giảm khối lượng code phải viết.
- Nhất quán với quyết định Đợt 3 (tự viết indicator, loại `technicalindicators` vì ngừng cập nhật).

## Hệ quả

**Tích cực:** không tăng bundle/dependency; mọi giá trị kiểm chứng được bằng tay; engine tái dùng
được cho backtest (Đợt 8) và alerts (backlog) vì là pure function tách khỏi UI.

**Đánh đổi / rủi ro phải chấp nhận:**

- Tự chịu trách nhiệm đúng đắn công thức MACD/BB — giảm thiểu bằng test giá trị tính tay + đối
  chiếu quy ước TradingView (như đã làm với RSI Wilder smoothing).
- Bộ quy tắc v1 là heuristic chưa kiểm chứng thống kê — Đợt 8 (backtest tối thiểu) chỉ mô tả tần
  suất tín hiệu lịch sử, KHÔNG hứa hẹn hiệu suất; disclaimer bắt buộc ở UI.
