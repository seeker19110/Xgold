# ADR-0011: Thêm mây Ichimoku + xếp chồng RSI vào engine phân tích; LẬT LẠI ranh giới "không entry/SL/TP" của ADR-0007/0010

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-07-13
- **Liên quan:** ADR-0007 (thay thế một phần — ranh giới entry/SL/TP), ADR-0010 (thay thế một phần
  — cùng ranh giới), đặc tả chỉ báo Pine Script "XGOLD — Ichimoku Kumo + Seeker-RSI + Signals" người
  dùng cung cấp 2026-07-13

## Bối cảnh

Người dùng cung cấp đặc tả một chỉ báo TradingView (Pine Script v5) kết hợp Ichimoku Kumo (chỉ mây),
ba đường RSI (10/14/21, "Seeker-RSI") và một "signal engine" tự chế sinh nhãn Mua/Bán, xác suất %,
mức rủi ro, và Entry/SL/TP theo ATR. ADR-0007 (2026-07-04) và ADR-0010 (2026-07-13) đã chốt ranh
giới "tín hiệu kỹ thuật tham khảo, KHÔNG entry/SL/TP" để giảm rủi ro pháp lý/hiểu nhầm là lời khuyên
đầu tư. Được hỏi trực tiếp (do đây là mâu thuẫn kiến trúc/pháp lý — CLAUDE.md §9), người dùng chọn
**lật lại ranh giới này có chủ đích** để đưa Entry/SL/TP + xác suất % vào sản phẩm, chấp nhận rủi ro
đã nêu trong đặc tả gốc (disclaimer "chưa backtest, không đảm bảo hiệu suất").

## Quyết định

- Thêm indicator `lib/indicators/ichimoku.ts` (mây Senkou A/B, donchian-based, đúng công thức
  chuẩn — chỉ mây, không tính Conversion/Base/Chikou riêng lẻ, theo đúng đặc tả gốc) và
  `lib/indicators/atr.ts` (ATR Wilder smoothing trên True Range).
- Thêm 2 rule vào engine hiện có (KHÔNG port nguyên hệ thống cộng dồn ad-hoc của Pine): R6
  `ichimoku-cloud` và R7 `rsi-stack` (dùng RSI 10/14/21). Mỗi rule vẫn trả `RuleVerdict` chuẩn
  (direction + reason), cộng trọng số qua `combine.ts` sẵn có — không sửa kiến trúc engine.
- Trọng số 7 rule phân bổ lại về tổng 1.0 (`lib/analysis/config.ts`): ma-cross 0.25 · price-vs-ma
  0.10 · rsi-zone 0.15 · macd-cross 0.20 · bb-touch 0.05 · ichimoku-cloud 0.15 · rsi-stack 0.10.
- Thêm module mới `lib/analysis/trade-levels.ts` (`computeTradeLevels`) — tính **Xác suất**
  (confidence 50–95%), **Rủi ro** (LOW/MEDIUM/HIGH), **Entry/SL/TP1/TP2** — CHỈ khi
  `suggestion.direction` là Mua/Bán (không có cho Trung lập). Công thức **phỏng theo** (không port
  nguyên văn) đặc tả Pine: confidence dùng tỷ lệ `|score|/maxScore` sẵn có của chính engine trọng số
  (thay cho biến `total` rời rạc của Pine, không tồn tại trong kiến trúc hiện có); risk/SL/TP dùng
  đúng công thức ATR + mây gốc (mây mỏng `<0.3×ATR`, giá xa mây `>2×ATR`, SL = biên mây ∓ 0.5×ATR,
  TP1/TP2 = R 1.5/2.5).
- **LẬT LẠI** ranh giới ADR-0007/0010: cho phép hiển thị Entry/SL/TP + xác suất %, với **disclaimer
  mạnh hơn** (`components/chart/analysis-disclaimer.tsx`) nêu rõ: xác suất là điểm đồng thuận kỹ
  thuật (không phải xác suất thắng đã kiểm định thống kê), Entry/SL/TP là mức tham chiếu suy từ
  ATR/mây (chưa backtest), người dùng tự quản trị vốn.
- Không port: bảng/`alertcondition` của Pine (không áp dụng — TradingView-only; thay bằng khối
  "Mức tham chiếu giao dịch" trong `analysis-panel.tsx`).

## Lý do

- Ichimoku + RSI-stack là chỉ báo/heuristic hợp lệ, khớp kiến trúc rule-based trọng số sẵn có — chi
  phí tích hợp thấp, không phá vỡ test hiện có (32+ unit test tính tay của engine).
- Entry/SL/TP + confidence là thay đổi có rủi ro pháp lý/hiểu nhầm cao hơn — đúng lý do 2 ADR trước
  chặn — nhưng người dùng đã được hỏi trực tiếp (không tự quyết thay) và chọn chấp nhận đánh đổi,
  với điều kiện disclaimer rõ ràng hơn.

## Các phương án đã cân nhắc

- **Giữ nguyên ADR-0007/0010 (không entry/SL/TP):** loại — người dùng chọn phương án lật lại.
- **Port nguyên văn signal engine ad-hoc của Pine** (cộng dồn trend+momentum riêng, ngưỡng cắt cứng
  ±2/±4, không dùng `combine.ts`): loại — tạo 2 hệ thống tín hiệu song song trong cùng ứng dụng, khó
  bảo trì và có thể mâu thuẫn nhau (vd rule cũ nói Mua nhưng biến "total" của Pine nói Bán).
- **Chỉ số mô tả trung dung thay vì Entry/SL/TP + Xác suất %** (phương án trung dung được đề xuất
  ban đầu): không chọn — người dùng ưu tiên phương án lật ADR đầy đủ.

## Hệ quả

**Tích cực:** tận dụng đúng kiến trúc trọng số sẵn có; không thêm dependency runtime; mọi công thức
mới (ATR, Ichimoku, trade-levels) đều test được bằng giá trị tính tay (chuẩn Đợt 3).

**Đánh đổi/rủi ro đã chấp nhận:**

- Entry/SL/TP + confidence % là heuristic **CHƯA backtest** — có thể gây hiểu nhầm là lời khuyên đầu
  tư dù đã có disclaimer mạnh hơn; công thức confidence là bản phỏng theo (dùng tỷ lệ điểm trọng số),
  không phải phép tính xác suất thống kê thật.
- Trọng số 7 rule thay đổi hành vi phân loại Mua/Bán/Trung lập mặc định so với trước (dù tổng vẫn
  1.0) — người dùng có thể chỉnh lại qua UI (`analysis-panel.tsx`) nếu không phù hợp.
- Nếu sau này phát hiện gây hiểu nhầm nghiêm trọng, cân nhắc ADR mới quay lại ranh giới cũ (không
  sửa ADR này — viết ADR kế tiếp theo đúng quy ước).

**Việc tiếp theo:** backtest tối thiểu (`lib/analysis/backtest.ts`, Đợt 8) nên mở rộng để đo tần
suất R/R đạt TP1/TP2 trên dữ liệu lịch sử XAU/USD khi có điều kiện — chưa bắt buộc ở v1 này.
