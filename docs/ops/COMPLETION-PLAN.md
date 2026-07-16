# COMPLETION-PLAN — Kế hoạch hoàn thiện Xgold (vòng 2, 2026-07-16)

> AI đọc/ghi file này để biết làm tới đâu — resume qua nhiều phiên.
> Trạng thái việc: ⬜ chưa làm · 🔄 đang làm · ✅ xong (kèm bằng chứng) · ➖ hủy (kèm lý do).
> **Vòng 1 (2026-07-03, F-001..F-010, W-101..W-303) đã đóng hoàn chỉnh** — xem lịch sử ở bản trước
> của file này trong Git (`git log -p -- docs/ops/COMPLETION-PLAN.md`), không tách file riêng.

- Ngày lập vòng 2: 2026-07-16 · Duyệt bởi người dùng: 2026-07-16 (đủ cả 3 đợt)
- Nguồn phát hiện: `docs/ops/COMPREHENSIVE-AUDIT-STATUS.md` (quét lại lần 2, 12/12 nhóm ✅, bao phủ
  Đợt 6–14) — khảo sát bằng subagent Explore, tổng hợp bởi phiên chính.

## Danh sách phát hiện (F-011..F-020) — nguồn cho các việc W-4xx bên dưới

| ID    | Nhóm | Mức độ  | Vị trí                                                                                | Mô tả                                                                                                                                                                                                                                                        |
| ----- | ---- | ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-012 | 4    | **Cao** | `components/chart/analysis-panel.tsx` (207 dòng, 0% coverage)                         | UI hiển thị trực tiếp Entry/SL/TP/Confidence/Risk (FT-23) — tính năng rủi ro cao nhất nếu hiển thị sai (tiền thật, quyết định giao dịch người dùng) — **0% unit test**, chỉ dựa vào 1 kịch bản E2E chưa chắc phủ hết nhánh (đặc biệt ca F-018 dưới).         |
| F-011 | 3    | Trung   | `app/chart/[symbol]/chart-page-client.tsx` (`handleExportCsv`)                        | `anchor.click()` gọi khi anchor **chưa `appendChild` vào DOM** — không tin cậy trên Firefox/trình duyệt cũ, nút "Xuất CSV" có thể im lặng không làm gì. Không có E2E nào click nút này nên hồi quy không bị bắt.                                             |
| F-018 | 3    | Thấp    | `lib/analysis/trade-levels.ts:64-67`                                                  | Khi thiếu cloud/ATR, hàm trả `confidence` có giá trị số nhưng `entry/sl/tp1/tp2` là `null` — sai với docstring "mọi trường null khi thiếu dữ liệu". UI (F-012) phải xử lý đúng ca nửa vời này nhưng chưa có test xác nhận.                                   |
| F-013 | 4    | Trung   | `app/so-sanh-gia-vang/page-client.tsx`, `components/gold-compare/compare-table.tsx`   | 0% coverage — logic tính (`use-gold-compare.ts`, `convert.ts`) đã test kỹ (91–100%) nhưng lớp UI render (định dạng số tiền, bảng) không có unit test, chỉ 1 E2E.                                                                                             |
| F-014 | 4    | Trung   | `app/chart/[symbol]/chart-page-client.tsx`, `app/gia-vang-trong-nuoc/page-client.tsx` | 0% coverage — bao gồm cả nút Xuất CSV mới (FT-28); chỉ test gián tiếp qua E2E, không đảm bảo phủ nhánh lỗi/loading/rỗng.                                                                                                                                     |
| F-015 | 5    | Trung   | `lighthouserc.json`                                                                   | `collect.url` thiếu `/quet-tin-hieu` và `/so-sanh-gia-vang` (đã tồn tại từ Đợt 10+) — ngân sách hiệu năng (LCP/CLS) không được gate trong CI cho 2 trang này.                                                                                                |
| F-016 | 9    | Thấp    | `CLAUDE.md:129` (mục 10)                                                              | Danh sách thư mục thiếu `lib/analysis/rules/`, `lib/providers-domestic/`, `lib/candles/{csv,legend}.ts`, `lib/gold-compare/`, `components/screener/`, `components/gold-compare/`, `app/quet-tin-hieu/`, `app/so-sanh-gia-vang/`, `app/gia-vang-trong-nuoc/`. |
| F-019 | 7    | Thấp    | `package.json` (`npm outdated`)                                                       | `typescript` 6.0.3→7.0.2, `eslint` 9.39.4→10.7.0, `@types/node` 22.20.0→26.1.1 — lệch major, không phải lỗ hổng bảo mật (`npm audit --omit=dev` sạch).                                                                                                       |
| F-020 | 12   | Thấp    | `lib/candles/resample.ts:43` (nhánh `default`)                                        | Không có test trực tiếp cho nhánh `default` trong `bucketStartMs` — chưa xác nhận có phải dead code hay ca hợp lệ chưa test.                                                                                                                                 |

_(F-017 — FEATURE-MAP/audit status cũ — đã tự đóng bằng việc viết lại 2 file này trong Pha 0/1 vòng 2,
không cần việc riêng.)_

## Definition of Complete (đề xuất — chỉnh theo phản hồi của bạn)

- [ ] 0 phát hiện mức Cao còn mở (F-012 phải đóng hoặc có quyết định ghi nhận rõ ràng).
- [ ] `analysis-panel.tsx` có unit test cho mọi nhánh hiển thị (đủ tín hiệu, thiếu dữ liệu — ca F-018,
      không có tín hiệu/tắt phân tích).
- [ ] Nút "Xuất CSV" hoạt động đúng chuẩn trên mọi trình duyệt (F-011 vá) + có E2E xác nhận tải file.
- [ ] `trade-levels.ts` nhất quán: hoặc sửa để `confidence` cũng `null` khi thiếu cloud/ATR, hoặc sửa
      docstring + đảm bảo UI xử lý đúng ca nửa vời — quyết định cụ thể ghi ở W-403.
- [ ] Coverage các trang client chính (`chart-page-client.tsx`, `app/gia-vang-trong-nuoc/page-client.tsx`,
      `app/so-sanh-gia-vang/page-client.tsx`, `compare-table.tsx`) không bắt buộc 100%, nhưng có ít nhất
      test smoke render + interaction chính (không còn 0%).
- [ ] Lighthouse CI đo cả `/quet-tin-hieu` và `/so-sanh-gia-vang`, đạt ngân sách đã đặt.
- [ ] `CLAUDE.md` mục 10 khớp cấu trúc thư mục thật.
- [ ] F-019 có quyết định ghi nhận (nâng cấp ngay hay hoãn có lý do) — không bắt buộc nâng cấp thật.
- [ ] `PROGRESS.md` phản ánh đúng trạng thái cuối vòng 2 + nợ kỹ thuật còn lại đều có chủ đích.

## Đợt 1 — Đúng-sai hiển thị rủi ro cao nhất (⬜)

| ID    | Từ phát hiện | Việc                                                                                                                                                                                                                | Tiêu chí nghiệm thu                                                                                                                              | Phụ thuộc | Ước lượng | Trạng thái |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---------- |
| W-401 | F-018        | Quyết định + sửa `trade-levels.ts`: làm `confidence` cũng `null` khi thiếu cloud/ATR (nhất quán với docstring) — trừ khi có lý do nghiệp vụ giữ confidence riêng (nếu vậy, sửa docstring cho đúng thay vì sửa code) | Test hồi quy: ca thiếu cloud/ATR → tất cả field cùng trạng thái (đều `null` hoặc đều có giá trị, không nửa vời); `trade-levels.test.ts` cập nhật | –         | S         | ⬜         |
| W-402 | F-012        | Viết unit test render cho `analysis-panel.tsx`: đủ tín hiệu (buy/sell/neutral), thiếu dữ liệu (ca W-401), tắt phân tích (`enabled: false`), disclaimer luôn hiển thị                                                | Coverage `analysis-panel.tsx` từ 0% lên ≥70% statement; test tái hiện đúng ca W-401 sau khi sửa                                                  | W-401     | M         | ⬜         |
| W-403 | F-011        | Sửa `handleExportCsv`: `document.body.appendChild(anchor)` trước `click()`, `removeChild` sau (hoặc dùng pattern chuẩn); thêm E2E click nút "Xuất CSV" xác nhận tải file đúng tên + nội dung                        | E2E mới xanh trên desktop+mobile; xác nhận thật bằng trình duyệt (đã làm 1 lần lúc code — lặp lại sau khi sửa DOM append)                        | –         | S         | ⬜         |

## Đợt 2 — Lấp hàng rào coverage + hiệu năng (⬜)

| ID    | Từ phát hiện | Việc                                                                                                                              | Tiêu chí nghiệm thu                                                                                    | Phụ thuộc | Ước lượng | Trạng thái |
| ----- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- | --------- | ---------- |
| W-404 | F-013        | Unit test smoke cho `compare-table.tsx` + `app/so-sanh-gia-vang/page-client.tsx` (render đủ 4 trạng thái, định dạng số tiền đúng) | Coverage 2 file từ 0% lên ≥60%; test hiện có (E2E) vẫn xanh                                            | –         | M         | ⬜         |
| W-405 | F-014        | Unit test smoke cho `chart-page-client.tsx` + `app/gia-vang-trong-nuoc/page-client.tsx` (4 trạng thái, nút Xuất CSV gọi đúng hàm) | Coverage 2 file từ 0% lên ≥60%                                                                         | W-403     | M         | ⬜         |
| W-406 | F-015        | Thêm `/quet-tin-hieu` và `/so-sanh-gia-vang` vào `lighthouserc.json` (`collect.url`)                                              | Lighthouse CI chạy thật trên cả 5 URL, đạt ngưỡng đã đặt (hoặc điều chỉnh có lý do nếu trang nặng hơn) | –         | S         | ⬜         |
| W-407 | F-020        | Thêm test trực tiếp cho nhánh `default` trong `bucketStartMs` (`resample.ts:43`) hoặc xác nhận + xóa nếu là dead code             | Coverage `resample.ts` 100% branch, hoặc dead code bị xóa với lý do ghi rõ                             | –         | S         | ⬜         |

## Đợt 3 — Dọn dẹp tài liệu + quyết định dependency (⬜)

| ID    | Từ phát hiện | Việc                                                                                                                                                                                             | Tiêu chí nghiệm thu                                                      | Phụ thuộc | Ước lượng | Trạng thái |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------- | --------- | ---------- |
| W-408 | F-016        | Cập nhật `CLAUDE.md` mục 10 — danh sách thư mục khớp cấu trúc thật hiện tại                                                                                                                      | Đối chiếu bằng mắt với `find app components lib -type d`, không cần test | –         | S         | ⬜         |
| W-409 | F-019        | Ghi quyết định vào `PROGRESS.md`: hoãn nâng cấp major (TypeScript 7/ESLint 10/@types/node 26) — lý do rủi ro thay đổi lớn ngoài phạm vi hoàn thiện lần này, hay nâng cấp thử nếu người dùng muốn | Quyết định + lý do ghi rõ; nếu chọn nâng cấp, chạy đủ cổng sau khi nâng  | –         | S         | ⬜         |

## Nhật ký hội tụ (Pha 4)

_(chưa có — điền sau khi Đợt 3 xong, quét lại đủ 12 nhóm)_

## Phát hiện chấp nhận rủi ro / dời đợt sau (phải có lý do)

- F-008 (kế thừa vòng 1, vẫn đúng): icon PWA thật — chờ ảnh từ người dùng.
- FT-09/10/11 (ingestion thật) — chờ deploy Supabase thật, ngoài phạm vi hoàn thiện code.
