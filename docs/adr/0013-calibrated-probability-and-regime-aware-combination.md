# ADR-0013: Hiệu chuẩn xác suất mua/bán từ dữ liệu + tổng hợp theo nhóm quy tắc có nhận diện chế độ thị trường

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-08-28
- **Liên quan:** ADR-0007 (engine rule-based thuần TS — giữ nguyên ràng buộc không thêm
  dependency), ADR-0010 (bề mặt phân tích, hợp lưu đa khung), ADR-0011 (Entry/SL/TP + "xác suất" —
  **thay thế một phần**: ngữ nghĩa của số "xác suất" và công thức tổng hợp)

## Bối cảnh

Người dùng yêu cầu đánh giá và nâng cấp phần phân tích xác suất mua/bán. Rà toàn bộ
`lib/analysis/` phát hiện năm vấn đề, trong đó vấn đề đầu là **lỗi thật đã tái hiện bằng test**:

1. **F-020 — Entry/SL/TP đảo ngược.** `computeTradeLevels` neo SL vào biên mây Ichimoku mà không
   kiểm tra giá có ở đúng phía mây so với hướng lệnh hay không. Quy tắc mây (R6) chỉ nặng
   0.15/1.0, nên sáu quy tắc còn lại thừa sức đẩy điểm qua ngưỡng khi giá đang ở phía ngược lại.
   Ca tái hiện: lệnh **Mua** entry 100 nhận SL **119** (trên giá vào), TP1 128.5, và vẫn được gắn
   nhãn "Rủi ro THẤP, xác suất 71.6%". Quét trên fixture ngẫu nhiên: 4/67 tín hiệu (≈6%) rơi vào ca
   này — không phải trường hợp hiếm.
2. **"Xác suất" không phải xác suất.** Công thức cũ rút gọn thành `50 + 36 × (|score|/maxScore)`,
   tức một phép đổi thang tuyến tính của điểm đồng thuận, không liên hệ với bất kỳ tần suất thắng
   nào. Trần đạt được thực tế là 92 chứ không phải 95 như tài liệu ghi.
3. **Cộng trọng số coi bảy quy tắc là độc lập** trong khi chúng tương quan mạnh (R2 và R6 gần như
   đo cùng một thứ; R3 và R7 cùng dựa trên RSI) → một lý do duy nhất được đếm thành nhiều bằng
   chứng, thổi phồng tỷ lệ đồng thuận.
4. **Trộn hai triết lý ngược nhau, không nhận diện chế độ thị trường:** R3/R5 là hồi quy trung
   bình, R1/R2/R4/R6/R7 là thuận xu hướng; trọng số cố định không thể đúng cho cả trend lẫn
   sideway.
5. **Không có gì kiểm chứng:** `backtest.ts` chỉ đếm số tín hiệu theo năm, tự ghi rõ "KHÔNG đo
   win-rate" — nên không ai biết ngưỡng 0.25, bộ trọng số hay bội số TP 1.5R/2.5R có giá trị gì.

Người dùng được trình bày ba đợt nâng cấp (vá lỗi / hiệu chuẩn / chất lượng tín hiệu) và **duyệt cả
ba**.

## Quyết định

**Đợt A — vá lỗi mức tham chiếu (`trade-levels.ts`).**

- Cổng cấu trúc: chỉ đưa Entry/SL/TP khi giá đã ở đúng phía mây theo hướng lệnh (Mua cần
  `close > cloud.top`, Bán cần `close < cloud.bot`). Mâu thuẫn → **không đưa mức**, kèm
  `blockedReason` hiển thị trên UI, thay vì đảo dấu hay đưa mức vô nghĩa.
- Chặn khoảng cách SL ở `MAX_SL_ATR_MULTIPLE = 3 × ATR` — SL neo vào mây khi giá chạy xa có thể
  cách entry hàng chục lần ATR, kéo theo TP vô nghĩa (thậm chí ra giá âm).
- Bất biến cuối trước khi trả kết quả: đúng thứ tự theo hướng lệnh và mọi mức là giá dương; vi
  phạm → không đưa mức.
- Mọi hằng số của công thức được đặt tên, có chú thích nguồn gốc và ghi rõ là heuristic.

**Đợt B — biến "xác suất" thành ước lượng từ dữ liệu.**

- `lib/analysis/labeling.ts` — gán nhãn kết cục theo **ba rào chắn**: với mỗi tín hiệu lịch sử, đi
  tới trước từng nến xem TP hay SL chạm trước, hoặc hết `maxBars` thì đóng theo giá đóng cửa. Vào
  lệnh ở **mở cửa nến kế** (không phải đóng cửa nến tín hiệu) và trừ chi phí `costFraction` —
  hai nguồn lạc quan có hệ thống lớn nhất của backtest ngây thơ. Quy ước bảo thủ: nến chạm cả SL
  lẫn TP tính là **SL**, vì OHLC không cho biết thứ tự trong nến.
- `lib/analysis/calibration.ts` — chia tỷ lệ đồng thuận thành khoang, đo tần suất thắng thực
  nghiệm mỗi khoang, làm trơn đơn điệu bằng **PAV** (pool adjacent violators), trả kèm **khoảng tin
  cậy Wilson 95%** và cỡ mẫu. Khoang dưới `minBinSample` → **không trả số**, UI nói "chưa đủ dữ
  liệu".
- `backtest.ts` — thêm `evaluatePerformance` (hit-rate, kỳ vọng theo R, phân bố kết cục, MFE/MAE,
  số nến giữ lệnh, thống kê mẫu bị loại và vì sao) và `walkForward` (hiệu chuẩn trên quá khứ, chấm
  **Brier** trên đoạn sau — hiệu chuẩn và chấm trên cùng mẫu sẽ cho điểm đẹp giả tạo).
- UI tách bạch hai đại lượng: **"Xác suất chạm TP1 trước SL"** (đã hiệu chuẩn, kèm khoảng tin cậy
  và cỡ mẫu) và **"Điểm đồng thuận quy tắc"** (0–100, chính là con số heuristic cũ, gọi đúng tên).
  Disclaimer viết lại theo ngữ nghĩa mới.

**Đợt C — chất lượng tín hiệu (`regime.ts`, `combine.ts`, `multi-timeframe.ts`).**

- **Nhóm quy tắc** (`RULE_FAMILY`): trend (R1/R2/R6), momentum (R4/R7), mean-reversion (R3/R5).
  Trong nhóm, quy tắc nặng nhất giữ nguyên trọng số, phần còn lại chỉ tính `REDUNDANCY_FACTOR = 0.5`
  — ba quy tắc xu hướng cùng nói "Mua" vì cùng một lý do không phải ba bằng chứng độc lập.
- **Cổng chế độ thị trường**: Kaufman Efficiency Ratio (|thay đổi ròng| / tổng |thay đổi từng
  nến|, bị chặn trong [0,1]) trên `regimeLookback = 20` nến, ngưỡng 0.3. Chế độ xu hướng nâng nhóm
  trend (×1.2) và hạ mạnh mean-reversion (×0.4); chế độ đi ngang thì ngược lại (×0.6 / ×1.5). Chưa
  đủ nến → coi là đi ngang (bảo thủ).
- **Ngưỡng phân loại trở thành tỷ lệ** trên tổng trọng số hiệu dụng (`score >= buyThreshold ×
maxScore`) thay vì con số tuyệt đối — giữ nguyên ý nghĩa khi người dùng tắt bớt quy tắc, và trùng
  đơn vị với `ratio` mà bảng hiệu chuẩn dùng.
- **Hợp lưu đa khung có trọng số** (`CONFLUENCE_WEIGHTS` 1h:1, 4h:2, 1D:3, 1W:4) thay cho trung
  bình cộng — khung lớn quyết định bối cảnh mà khung nhỏ chỉ dao động bên trong.
- Chế độ cũ vẫn giữ được qua `combineMode: 'linear'` + `regimeAware: false` để đối chiếu.

## Lý do

- Vấn đề 1 là lỗi có thể gây thiệt hại tiền thật cho người đọc mức tham chiếu — phải vá bất kể
  phần còn lại, và phải vá bằng cách **từ chối đưa mức**, không phải bằng cách sửa dấu cho "có số
  để hiển thị".
- Sản phẩm đã lật ADR-0007/0010 để hiển thị "xác suất %"; nếu vẫn giữ nghĩa cũ thì con số đó gây
  hiểu nhầm đúng theo cách hai ADR trước lo ngại. Hiệu chuẩn từ dữ liệu là cách duy nhất khiến từ
  "xác suất" trở thành trung thực — và khi thiếu mẫu thì nói thẳng là thiếu.
- PAV, Wilson và Brier đều là mã thuần vài chục dòng, giữ đúng ràng buộc "không thêm dependency
  runtime" của ADR-0007, và test được bằng giá trị tính tay.
- Nhóm hoá + cổng chế độ là thay đổi rẻ nhất có tác động lớn nhất tới chất lượng phân loại, đồng
  thời giữ nguyên kiến trúc `RuleVerdict` — mỗi quy tắc vẫn chỉ trả một hướng.

## Các phương án đã cân nhắc

- **Chỉ vá lỗi (Đợt A), giữ nguyên "xác suất" heuristic:** loại — người dùng duyệt cả ba đợt; và
  giữ nguyên nghĩa cũ là giữ nguyên nguy cơ hiểu nhầm.
- **Bỏ hẳn số "xác suất", chỉ hiện điểm đồng thuận:** đã cân nhắc; không chọn vì mất thông tin thật
  sự hữu ích khi có đủ mẫu. Thay vào đó hiện **cả hai**, gọi đúng tên từng cái.
- **Hồi quy logistic / học máy để hiệu chuẩn:** loại ở đợt này — cần dependency, khó test bằng giá
  trị tính tay, và với vài trăm tín hiệu thì binning + PAV đã đủ và minh bạch hơn nhiều.
- **Giữ ngưỡng tuyệt đối:** loại — ngưỡng tuyệt đối đổi nghĩa ngầm mỗi khi người dùng tắt quy tắc.

## Hệ quả

**Tích cực:** mức tham chiếu không còn ca đảo ngược; con số "xác suất" có nghĩa kiểm chứng được và
tự nói khi thiếu dữ liệu; đã có công cụ đo hiệu suất thật (`evaluatePerformance`, `walkForward`) để
các đợt sau tinh chỉnh trọng số **bằng số liệu** thay vì cảm tính; không thêm dependency runtime.

**Đánh đổi/rủi ro đã chấp nhận:**

- **Hành vi phân loại mặc định thay đổi** (gộp nhóm + cổng chế độ + ngưỡng tỷ lệ): cùng một chuỗi
  nến có thể ra kết luận khác v1. Ai cần hành vi cũ đặt `combineMode: 'linear'`.
- **Hiệu chuẩn trên UI là in-sample**: bảng học từ chính đoạn lịch sử đang tải, nên xác suất hiển
  thị lạc quan hơn thực tế ngoài mẫu. `walkForward` là công cụ đo mức lạc quan đó, nhưng cần dữ
  liệu lịch sử dài — **chỉ chạy được sau khi nối Supabase/Twelve Data thật**, hiện mới chạy trên
  fixture.
- Các hằng số của Đợt C (ngưỡng ER 0.3, hệ số chế độ, `REDUNDANCY_FACTOR`, trọng số khung) là
  **heuristic có chủ đích, chưa hiệu chuẩn** — phải đo lại bằng `walkForward` trên dữ liệu thật.
- Xác suất vẫn là ước lượng lịch sử, **không phải bảo đảm**; disclaimer đã nêu rõ.

**Việc tiếp theo:** sau khi có dữ liệu lịch sử thật, chạy `walkForward` theo từng symbol và từng
khung (XAU/USD, XAG/USD, DXY, USD/VND hành xử khác nhau → nên có bảng hiệu chuẩn riêng), đối chiếu
Brier giữa `linear` và `grouped`, rồi chốt lại trọng số/ngưỡng bằng số liệu trong một ADR kế tiếp.
