---
description: Kiểm thử (GĐ 5) — chiến lược test theo hồ sơ: kim tự tháp, ca biên, E2E+a11y, hiệu năng, mỗi bug → 1 test hồi quy
---

Dẫn dắt **Giai đoạn 5 — Kiểm thử** (KHUNG-1 GĐ 5), làm **đan xen** với phát triển (GĐ 4). Mục tiêu: đúng & ổn định — phủ **đường đi quan trọng + ca biên**, không chạy theo con số phần trăm máy móc.

> Nền tảng: KHUNG-1 GĐ 5 + `BO-SUNG-chat-luong.md` Nhóm 2 mục 3 (a11y), mục 4 (E2E + coverage + dữ liệu test), mục 6 (chống lỗi logic). **Đọc đúng phần cần.** Cổng test thay đổi theo **hồ sơ loại dự án** (KHUNG-3 PHẦN C).

## Bước 0 — Chọn cổng test theo hồ sơ
- **Web/UI:** unit + integration + **E2E Playwright (desktop+mobile) + axe** + Lighthouse (hiệu năng).
- **Backend/API:** unit + **integration (HTTP/DB thật qua testcontainers)** + **contract test** + p95 latency; thay E2E trình duyệt.
- **CLI/Thư viện:** unit + **golden/snapshot test** + ma trận đa phiên bản runtime; SemVer không vỡ.
- **Mobile native:** unit + **E2E thiết bị (Maestro/Detox)** + a11y nền tảng.
- **Data/ML:** **data validation** (pandera/Great Expectations) + test **tái lập** + đánh giá mô hình (eval set).
- **Game/Blockchain:** playtest có kịch bản / **fuzzing + coverage cao** (lỗi không sửa được sau deploy).

## Bước 1 — Kim tự tháp test (ưu tiên đúng chỗ)
Nhiều **unit** → ít hơn **integration** → vài **E2E** cho luồng quan trọng nhất. Logic nghiệp vụ phức tạp: mỗi nhánh có **≥ 1 test ca biên**.

## Bước 2 — Ca biên & lỗi logic (type-checker KHÔNG bắt — BO-SUNG mục 6)
Ô trống/dữ liệu cực dài/số âm/ký tự lạ · nhấn nút liên tục · mất mạng giữa chừng · `null` vs 0 · **async race/idempotency** · thời gian **UTC** · tiền **không dùng float**.

## Bước 3 — Bảo mật & a11y cơ bản
- Thử truy cập dữ liệu người khác; thử vượt kiểm tra phía client (kiểm soát truy cập server).
- A11y (hồ sơ UI): điều hướng bàn phím, trình đọc màn hình, tương phản — **tự động bằng `jsx-a11y` + axe**.

## Bước 4 — Hiệu năng theo hồ sơ
Web: Lighthouse + ngân sách CWV (BO-SUNG mục 2), thử dữ liệu lớn. Backend: đo p95/throughput. CLI/lib: thời gian chạy/kích thước. Game: frame budget.

## Bước 5 — Hồi quy & dữ liệu test
**Mỗi bug đã gặp → 1 test hồi quy.** Dữ liệu test có chiến lược (factory/fixture, không dùng dữ liệu thật). Giữ coverage ≥ ngưỡng đã đặt (nâng dần với dự án có sẵn).

## Cổng GĐ 5
Toàn bộ test xanh · đã qua các loại test bắt buộc **của hồ sơ** cho luồng chính · ca biên & lỗi logic đã phủ. Trước commit/merge → chạy `/cong`. Cập nhật `PROGRESS.md`.

Bắt đầu: chạy **Bước 0 — chọn cổng test theo hồ sơ** (đọc loại dự án từ `PROJECT.md` mục 0), rồi rà từng bước.
