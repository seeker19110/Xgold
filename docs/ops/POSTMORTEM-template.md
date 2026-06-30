# Post-mortem: [Tiêu đề ngắn gọn về sự cố]

> Sao chép file này cho mỗi sự cố SEV1/SEV2: `docs/ops/postmortem-YYYY-MM-DD-<slug>.md`.
> **Văn hóa không đổ lỗi (blameless):** mục tiêu là cải thiện hệ thống, không phán xét con người.

- **Ngày sự cố:**
- **Mức (severity):** SEV1 / SEV2 / SEV3
- **Thời lượng:** từ ____ đến ____ (tổng: ____)
- **Người điều phối:**
- **Trạng thái:** Đang điều tra / Đã khắc phục / Đã đóng

## Tóm tắt

<!-- 2–3 câu: chuyện gì xảy ra, ảnh hưởng ai, đã giải quyết thế nào. -->

## Ảnh hưởng

- Người dùng bị ảnh hưởng (số lượng/tỷ lệ):
- Chức năng bị ảnh hưởng:
- Dữ liệu/tiền bị ảnh hưởng (nếu có):

## Dòng thời gian (UTC)

| Thời điểm | Sự kiện |
|-----------|---------|
| | Bắt đầu (nguyên nhân được đưa vào / kích hoạt) |
| | Phát hiện (cảnh báo/báo cáo đầu tiên) |
| | Bắt đầu giảm thiệt hại |
| | Khôi phục dịch vụ |
| | Đóng sự cố |

## Nguyên nhân gốc

<!-- Phân tích "5 Whys": vì sao xảy ra? vì sao không bị chặn sớm hơn?
     Vì sao các hàng rào (test/CI/cảnh báo) không bắt được? -->

## Cái gì đã chạy tốt / chưa tốt

- **Tốt:**
- **Chưa tốt:**
- **May mắn (suýt tệ hơn):**

## Hành động khắc phục (mỗi mục → issue có người phụ trách + hạn)

| Hành động | Loại (vá / phòng ngừa / phát hiện) | Người phụ trách | Hạn | Issue |
|-----------|-----------------------------------|-----------------|-----|-------|
| | | | | |

> Quy tắc: mỗi sự cố để lại **ít nhất một hàng rào mới** (test hồi quy, cảnh báo, kiểm tra CI)
> để cùng nguyên nhân không tái diễn.
