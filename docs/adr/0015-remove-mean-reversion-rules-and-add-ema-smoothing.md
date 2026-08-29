# ADR-0015: Gỡ nhóm quy tắc hồi quy trung bình (`rsi-zone`, `bb-touch`) và thêm lớp làm trơn EMA cho điểm tổng hợp

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-08-29
- **Liên quan:** ADR-0011 (bộ quy tắc R1–R7), ADR-0013 (gộp nhóm + ngưỡng theo tỷ lệ trên
  `maxScore`), ADR-0014 (gỡ `macd-cross`) — **thay thế một phần** cả ba ở phần thành phần bộ quy
  tắc, trọng số, và cách phân loại hướng.

## Bối cảnh

Người dùng yêu cầu gỡ tiếp `bb-touch` rồi `rsi-zone` — tức toàn bộ nhóm hồi quy trung bình.

Phép đo trước đó (ADR-0014) đã cảnh báo `bb-touch` là "chất ổn định". Đo lại trên cấu hình 6 quy
tắc hiện hành cho thấy cảnh báo đó **có điều kiện**, không tuyệt đối:

| Cấu hình                                   | Tín hiệu/1000 nến | Đảo chiều ≤5 nến | Giữ hướng |
| ------------------------------------------ | ----------------- | ---------------- | --------- |
| 6 quy tắc (trước thay đổi này)             | 86.7              | 3.4%             | 4.1       |
| Bỏ `bb-touch`, nhân đều trọng số           | 87.8              | 5.4%             | 4.3       |
| Bỏ `bb-touch`, dồn trọng số cho `rsi-zone` | 86.2              | 3.0%             | 4.0       |
| **Bỏ cả `bb-touch` lẫn `rsi-zone`**        | **123.1**         | **23.3%**        | 4.6       |

Thứ cần giữ là **tiếng nói của nhóm hồi quy trung bình**, không phải bản thân `bb-touch`: chuyển
trọng số của nó sang `rsi-zone` thì gỡ được mà nhiễu còn giảm nhẹ. Nhưng gỡ **cả nhóm** thì nhiễu
tăng gần 7 lần — xoá sạch thành quả của ADR-0014.

Đây là mâu thuẫn giữa yêu cầu và số đo, nên được nêu ra kèm phương án bù trước khi làm (CLAUDE.md
§2, §9). Đo lớp bù:

| 4 quy tắc trend+momentum | Tín hiệu/1000 nến | Đảo chiều ≤5 nến | Giữ hướng |
| ------------------------ | ----------------- | ---------------- | --------- |
| Không bù gì              | 123.1             | 23.3%            | 4.6       |
| + EMA(3)                 | 77.2              | 6.9%             | 6.8       |
| + EMA(5)                 | 60.6              | 2.6%             | 8.3       |
| **+ EMA(8) (đã chọn)**   | **45.6**          | **0.5%**         | **10.5**  |
| + EMA(12)                | 36.0              | 0.0%             | 12.7      |

Người dùng chọn phương án gỡ cả hai kèm **EMA(8)**.

## Quyết định

**1. Gỡ bỏ hoàn toàn `rsi-zone` và `bb-touch`** — xoá hai file quy tắc trong `lib/analysis/rules/`,
gỡ khỏi `RULE_IDS`, `RULE_FAMILY`, bảng evaluator, nhãn UI và bộ test. Gỡ luôn các tham số chỉ phục
vụ chúng (`rsiOversold`, `rsiOverbought`, `bbPeriod`, `bbMultiplier`) và trường `bb` trong
`AnalysisInputs`. **Chỉ báo Bollinger và RSI hiển thị trên chart không đổi** — đó là
`ChartConfig.bollinger` / `ChartConfig.rsiLines`, đường dẫn cấu hình riêng.

- Nhóm `mean-reversion` không còn quy tắc nào nên bị gỡ khỏi kiểu `RuleFamily` và khỏi
  `REGIME_FAMILY_MULTIPLIER` thay vì để lại nhánh chết. Muốn thêm lại một quy tắc hồi quy trung
  bình thì phải khôi phục cả nhóm lẫn hệ số của nó (bản cũ: trend 0.4 / range 1.5) — ghi rõ trong
  chú thích tại `regime.ts`.
- Bốn trọng số còn lại nhân đều ×4/3 giữ quy ước tổng = 1.0: ma-cross 0.4167 · price-vs-ma 0.1667 ·
  ichimoku-cloud 0.25 · rsi-stack 0.1666. Như ADR-0013 và ADR-0014 đã ghi, thang tuyệt đối không
  ảnh hưởng hành vi — chỉ tỷ lệ giữa các quy tắc mới có ý nghĩa.

**2. Thêm lớp làm trơn EMA trên điểm tổng hợp** (`lib/analysis/smoothing.ts`,
`config.smoothingSpan`, mặc định 8, 0 = tắt):

- `evaluateSeries` là đường đi mới của sản phẩm: đánh giá thô toàn chuỗi, làm trơn chuỗi điểm chuẩn
  hoá bằng EMA, rồi mới phân ngưỡng. `evaluateAt` giữ nguyên nghĩa "đánh giá THÔ tại một nến" —
  EMA cần trạng thái chạy dọc chuỗi nên không làm trơn được tại một điểm rời rạc.
- `suggestLatest`, `signalEvents` và `labelSignals` đều đi qua `evaluateSeries`, nên gợi ý đang
  hiển thị, markers lịch sử và bảng hiệu chuẩn xác suất luôn nói về **cùng một tập tín hiệu**.
- `Suggestion` thêm trường `norm` — điểm chuẩn hoá dùng để phân loại. Mọi nơi cần "tỷ lệ đồng
  thuận" (hiệu chuẩn, mức tham chiếu, hợp lưu đa khung, screener) đọc trường này thay vì tự chia
  `score / maxScore`, nếu không sẽ dùng số thô trong khi hướng hiển thị đến từ số đã làm trơn.

**3. Vá chi phí bậc hai trong `ichimoku-cloud`** — quy tắc này dựng lại mảng biên mây dài bằng cả
lịch sử ở **mỗi lần gọi**. Chi phí đó vô hại khi chỉ đánh giá một nến, nhưng `evaluateSeries` quét
toàn chuỗi nên nó thành O(n²). Thêm `findRecentCrossBy` (nhận hàm truy cập thay vì mảng dựng sẵn)
và dùng nó trong rule.

## Lý do

- **Nhiễu nằm ở dấu của điểm, không ở chỗ điểm dao động quanh ngưỡng.** Nghiên cứu đã đo bốn cách
  lọc: trễ Schmitt (dead band quanh ngưỡng) làm **tệ hơn** (18.1% so với 16.0% nền), "nghỉ N nến"
  chỉ cắt số lượng mà không đổi tỷ lệ nháy, xác nhận k nến đứng thứ hai, còn làm trơn chính chuỗi
  điểm thắng áp đảo. Chọn đúng chỗ để can thiệp quan trọng hơn chọn tham số.
- EMA là mã vài dòng, thuần TS, nhân quả và test được bằng giá trị tính tay — giữ ràng buộc "không
  thêm dependency runtime" của ADR-0007.
- Gỡ cả nhóm hồi quy trung bình là quyết định của người dùng sau khi đã được trình bày số đo phản
  đối; lớp làm trơn khiến lựa chọn đó không những không hại mà còn tốt hơn hiện trạng.

## Các phương án đã cân nhắc

- **Chỉ gỡ `bb-touch`, dồn trọng số cho `rsi-zone`** (3.0% nháy): tốt, nhưng không đáp ứng yêu cầu
  gỡ cả `rsi-zone`.
- **Gỡ cả hai, không bù gì** (23.3% nháy): đã trình bày kèm số đo; người dùng không chọn.
- **Giữ 6 quy tắc và chỉ thêm EMA(5)** (0.2% nháy, giữ hướng 7.2 nến): tốt nhất trên thang đo nhiễu
  nhưng không phải điều người dùng yêu cầu. Đã nêu như dữ kiện để cân nhắc.
- **EMA(5) thay vì EMA(8)** (2.6% nháy, giữ hướng 8.3): người dùng chọn EMA(8) để trơn hơn.
- **Trễ Schmitt / cooldown**: loại vì đo được là không trúng nguyên nhân (xem "Lý do").

## Hệ quả

**Tích cực:** so với trước thay đổi này, tỷ lệ đảo chiều trong 5 nến giảm từ 3.4% xuống **0.5%**,
độ bền tín hiệu tăng từ 4.1 lên **10.5 nến**, tần suất tín hiệu giảm từ 86.7 xuống 45.6/1000 nến.
Engine gọn hơn hai quy tắc, hai nhóm tham số và một chuỗi chỉ báo. Rule Ichimoku hết chi phí bậc
hai (quét 25×400 nến hết ~34 ms).

**Đánh đổi/rủi ro đã chấp nhận:**

- **Độ trễ vào lệnh.** EMA(8) khiến điểm tổng hợp phản ứng chậm hơn với chuyển động thật, không chỉ
  với nhiễu. Chưa đo được cái giá này vì cần dữ liệu thật — đây là thứ cần kiểm tra đầu tiên khi có
  `walkForward` chạy trên lịch sử thật.
- **Ngân sách dữ liệu để hiệu chuẩn căng thêm.** Tần suất tín hiệu giảm 47% so với trước, nên số
  tháng dữ liệu cần để bảng hiệu chuẩn đủ mẫu tăng gần gấp đôi (nghiên cứu ngân sách dữ liệu
  2026-08-29: 5m cần ~4.5 tháng ở tần suất cũ).
- **Engine nay thuần xu hướng + động lượng.** Trong thị trường đi ngang kéo dài, không còn quy tắc
  nào nói ngược lại đám đông thuận xu hướng; cổng chế độ (`regimeAware`) chỉ còn hạ trọng số nhóm
  xu hướng chứ không còn nhóm nào để nâng.
- **Giá trị dự báo của hai quy tắc bị gỡ chưa từng được đo** — như `macd-cross` ở ADR-0014, nghiên
  cứu chỉ chứng minh ảnh hưởng lên độ ổn định.
- **Hành vi phân loại mặc định thay đổi** với mọi mã và mọi khung.
- Cấu hình cũ đã lưu chứa khoá `rsi-zone`/`bb-touch` vẫn giải mã được (Zod loại khoá lạ);
  `smoothingSpan` có `.default(8)` nên cấu hình cũ thiếu trường này vẫn hợp lệ.

**Việc tiếp theo:** khi có dữ liệu thật, đo cái giá của độ trễ EMA bằng `walkForward` (so
`smoothingSpan` 0 / 5 / 8), và đối chiếu chất lượng hiệu chuẩn trước–sau khi gỡ nhóm hồi quy trung
bình.
