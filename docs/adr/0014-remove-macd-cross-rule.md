# ADR-0014: Gỡ bỏ quy tắc `macd-cross` khỏi engine phân tích

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-08-29
- **Liên quan:** ADR-0007 (engine rule-based thuần TS), ADR-0011 (bộ 7 quy tắc R1–R7 và trọng số),
  ADR-0013 (ngưỡng phân loại theo tỷ lệ trên `maxScore`, gộp nhóm quy tắc) — **thay thế một phần**
  ADR-0011 ở phần thành phần bộ quy tắc và trọng số mặc định.

## Bối cảnh

Nghiên cứu lọc nhiễu (2026-08-29) đo độ ổn định tín hiệu trên 25 đường × 400 nến. Lưu ý phạm vi:
dữ liệu mẫu KHÔNG dùng được để đo lợi thế dự báo (ADR-0013 đã ghi), nhưng dùng được để đo **độ ổn
định** — đây là tính chất cơ học của bộ quy tắc trên chuỗi giá có biến động thực tế, không phụ thuộc
chuỗi đó có dự báo được hay không.

Hiện trạng đo được: engine phát **97.5 tín hiệu/1000 nến** (cứ ~10 nến một tín hiệu mới) trong khi
hướng chỉ giữ nguyên trung bình **3.6 nến**, và **16.0%** số tín hiệu đảo chiều trong vòng 5 nến.

Đếm riêng từng quy tắc thì `rsi-stack` đổi ý nhiều nhất (285 lần/1000 nến). Nhưng khi thực sự tắt
từng quy tắc, thứ tự đảo lộn hoàn toàn:

| Cấu hình                                | Tín hiệu/1000 nến | Đảo chiều ≤5 nến | Giữ hướng |
| --------------------------------------- | ----------------- | ---------------- | --------- |
| Đủ 7 quy tắc                            | 97.5              | 16.0%            | 3.6       |
| Bỏ `rsi-stack` (ồn nhất khi đứng riêng) | 80.8              | 13.6%            | 3.2       |
| **Bỏ `macd-cross`**                     | 86.7              | **3.4%**         | 4.1       |
| Bỏ `ichimoku-cloud`                     | 105.7             | 31.4%            | 2.9       |
| Bỏ `bb-touch`                           | 105.3             | 23.6%            | 3.7       |

`macd-cross` là nguồn nhiễu lớn nhất ở cấp tổng hợp: trọng số 0.20 (nặng thứ hai) nhưng trung lập
64% thời gian, nên mỗi lần nó lên tiếng là bẻ lái rất mạnh. Ngược lại `ichimoku-cloud` và `bb-touch`
là **chất ổn định** — bỏ chúng thì nhiễu tăng gấp đôi. Kết luận phương pháp luận: **độ ồn của một
quy tắc khi đứng riêng không dự đoán được đóng góp của nó vào nhiễu tổng hợp.**

## Quyết định

- **Gỡ bỏ hoàn toàn** quy tắc `macd-cross`: xoá file quy tắc của nó trong `lib/analysis/rules/`, gỡ khỏi
  `RULE_IDS`, `RULE_FAMILY`, bảng evaluator của `combine.ts`, nhãn UI, và bộ test của nó.
- Gỡ luôn các tham số chỉ phục vụ quy tắc này (`macdFast`, `macdSlow`, `macdSignal`,
  `macdCrossLookback`) và trường `macd` trong `AnalysisInputs` — không còn nơi dùng. **Chỉ báo MACD
  hiển thị trên chart không đổi**: đó là `ChartConfig.macd`, một đường dẫn cấu hình hoàn toàn riêng.
- **Phân bổ lại trọng số bằng cách nhân đều ×1.25** cho 6 quy tắc còn lại, giữ quy ước tổng = 1.0:
  ma-cross 0.3125 · price-vs-ma 0.125 · rsi-zone 0.1875 · bb-touch 0.0625 · ichimoku-cloud 0.1875 ·
  rsi-stack 0.125.

## Lý do

Ba phương án phân bổ lại đã được **đo** chứ không chọn theo cảm tính:

| Phương án                                      | Tín hiệu/1000 nến | Đảo chiều ≤5 nến | Giữ hướng |
| ---------------------------------------------- | ----------------- | ---------------- | --------- |
| **Nhân đều ×1.25 (đã chọn)**                   | 86.7              | **3.4%**         | 4.1       |
| Giữ cân bằng NHÓM (dồn 0.20 cho `rsi-stack`)   | 156.5             | **46.2%**        | 4.6       |
| Dồn cho nhóm xu hướng (`ichimoku-cloud` +0.20) | 92.5              | 8.1%             | 5.0       |

Phương án "giữ cân bằng nhóm" là lựa chọn đúng về lý thuyết (bảo toàn tỷ lệ trend 0.50 / momentum
0.30 / mean-reversion 0.20 mà bộ gộp nhóm ADR-0013 thực sự vận hành trên đó) nhưng **tệ nhất trong
thực đo**: dồn trọng số cho `rsi-stack` — quy tắc đổi ý 285 lần/1000 nến — đẩy nhiễu lên 46.2%, gấp
gần ba lần hiện trạng. Đây là lý do phải đo trước khi chọn.

Nhân đều ×1.25 cho kết quả **trùng khớp tuyệt đối** với phương án để tổng ở 0.8. Đó là hệ quả trực
tiếp của ADR-0013: khi ngưỡng phân loại là tỷ lệ trên `maxScore`, thang tuyệt đối của trọng số không
còn ảnh hưởng hành vi — chỉ TỶ LỆ giữa các quy tắc mới có ý nghĩa. Việc chuẩn hoá về tổng 1.0 vì vậy
thuần tuý là giữ quy ước cho dễ đọc.

## Các phương án đã cân nhắc

- **Chỉ tắt mặc định, giữ mã** (`enabled: false`): đã đề xuất và là phương án khuyến nghị ban đầu vì
  đảo ngược được và giữ lựa chọn cho người dùng. Người dùng chọn gỡ hẳn.
- **Làm trơn điểm tổng hợp bằng EMA(5) thay vì gỡ quy tắc**: trong cùng thí nghiệm cho kết quả TỐT
  HƠN (đảo chiều 0.6% so với 3.4%, giữ hướng 5.2 nến) mà không mất quy tắc nào. Đã trình bày cho
  người dùng; không chọn ở đợt này. **Vẫn là ứng viên tốt cho đợt sau** và độc lập với quyết định
  này.
- **Sửa `macd-cross` bằng dead band** (yêu cầu histogram vượt ngưỡng × ATR thay vì chỉ cần giao
  cắt): chưa cân nhắc kỹ vì người dùng đã chọn gỡ hẳn; nếu sau này muốn khôi phục MACD vào engine
  thì đây là hướng nên thử trước, thay vì khôi phục nguyên trạng.

## Hệ quả

**Tích cực:** tỷ lệ đảo chiều trong 5 nến giảm từ 16.0% xuống 3.4% (giảm ~79%); độ bền tín hiệu tăng
từ 3.6 lên 4.1 nến; tần suất tín hiệu giảm 11%. Engine gọn hơn một quy tắc, một file, một nhóm tham
số và một chuỗi chỉ báo phải tính mỗi lần đánh giá.

**Đánh đổi/rủi ro đã chấp nhận:**

- **Giá trị dự báo của `macd-cross` chưa từng được đo** và nay bị bỏ cùng với nhiễu của nó. Nghiên
  cứu chỉ chứng minh nó gây bất ổn, KHÔNG chứng minh nó vô dụng. Nếu sau này hiệu chuẩn trên dữ liệu
  thật cho thấy chất lượng tín hiệu giảm, đây là nghi phạm đầu tiên — khôi phục bằng ADR mới, ưu
  tiên bản có dead band.
- **Hành vi phân loại mặc định thay đổi** với mọi mã và mọi khung: cùng chuỗi nến có thể ra kết luận
  khác trước.
- **Nhóm momentum nay chỉ còn một quy tắc** (`rsi-stack`), nên cơ chế chiết khấu bằng chứng trùng
  lặp của ADR-0013 không còn tác dụng gì trong nhóm đó.
- Cấu hình cũ đã lưu (`localStorage` khoá `xgold:chart-config`, hoặc URL chia sẻ) có chứa khoá
  `macd-cross`: Zod loại bỏ khoá lạ nên vẫn giải mã bình thường, chỉ mất phần cấu hình của quy tắc
  đã gỡ. Ngược lại, cấu hình lưu SAU thay đổi này sẽ thiếu khoá `macd-cross` nếu người dùng quay về
  bản cũ — chấp nhận, vì khi đó Zod trả về mặc định cho toàn bộ cấu hình.

**Việc tiếp theo:** khi có dữ liệu thật, dùng `walkForward` đối chiếu chất lượng hiệu chuẩn trước và
sau khi gỡ, và cân nhắc EMA làm trơn điểm tổng hợp như một lớp lọc nhiễu độc lập.
