---
description: Xử lý sự cố production (incident response) — giảm thiệt hại trước, tìm nguyên nhân sau; kết bằng post-mortem cho SEV1/SEV2
---

Kích hoạt **quy trình xử lý sự cố production**. Đọc kỹ `docs/ops/incident-response.md` và **làm theo đúng các bước trong đó**. Nguyên tắc lõi: **giảm thiệt hại TRƯỚC, tìm nguyên nhân SAU** — theo bước cố định để không phải suy nghĩ lúc đang hoảng.

> Đây là việc đụng **production & dữ liệu thật** → thuộc nhóm "PHẢI dừng và hỏi" (CLAUDE.md §9). **An toàn trước tốc độ:** mọi thao tác lên dữ liệu thật phải cân nhắc rollback **trước** khi chạy, và xác nhận với người dùng trước các bước không thể hoàn tác.

> 💡 **Model/effort:** pha **giảm thiệt hại khẩn cấp** cần NHANH — cứ để nguyên `opusplan`, đừng dừng đổi model. Chỉ khi sang **tìm nguyên nhân gốc / viết post-mortem** (lý luận sâu) mới cân nhắc nâng `/model claude-fable-5` (hoặc `claude-opus-4-8`) + `/effort xhigh`; xong hạ lại. Chi tiết: `docs/framework/models-and-automation.md` §4 (Effort & thinking).

## Trình tự (bám `docs/ops/incident-response.md`)
1. **Phát hiện & ghi nhận:** mở issue sự cố (template `incident` trong `.github/ISSUE_TEMPLATE/`); ghi thời điểm bắt đầu, triệu chứng, ai xử lý, nguồn cảnh báo (Sentry/uptime/người dùng).
2. **Đánh giá mức (severity):** SEV1 (sập/mất/lộ dữ liệu) · SEV2 (suy giảm nặng) · SEV3 (ảnh hưởng nhỏ). SEV1 = ưu tiên tuyệt đối.
3. **Giảm thiệt hại (mitigate) trước khi vá triệt để:** rollback bản deploy gần nhất (Vercel: Promote bản trước) HOẶC tắt feature flag gây lỗi HOẶC khôi phục dữ liệu từ backup/PITR. **Xác nhận người dùng trước thao tác lên dữ liệu thật.**
4. **Liên lạc:** cập nhật trạng thái cho người dùng nếu ảnh hưởng diện rộng.
5. **Khắc phục triệt để:** nhánh `fix/...` → qua cổng commit/merge (`/gate`) → deploy.
6. **Đóng sự cố:** xác nhận hết triệu chứng; ghi thời điểm kết thúc.
7. **Post-mortem (SEV1/SEV2):** sao **Mẫu post-mortem** ở cuối `incident-response.md` thành `docs/ops/postmortem-YYYY-MM-DD-<slug>.md`; điền dòng thời gian (UTC), nguyên nhân gốc (5 Whys), hành động khắc phục → mỗi mục một issue có người phụ trách + hạn. **Văn hóa không đổ lỗi (blameless).**

## Bất biến
- Một **incident lead** điều phối, kể cả nhóm nhỏ — tránh giẫm chân.
- **Ghi lại mọi thay đổi lúc chữa cháy** để post-mortem tái dựng được dòng thời gian.
- Mỗi sự cố để lại **ít nhất một hàng rào mới** (test hồi quy / cảnh báo / kiểm tra CI) để cùng nguyên nhân không tái diễn.

Nếu **không tìm thấy** `docs/ops/incident-response.md` (repo chưa áp khung): vẫn theo đúng trình tự tóm tắt trên, và báo người dùng cân nhắc chạy `copy-framework.sh`.

Bắt đầu: hỏi nhanh **triệu chứng + nguồn cảnh báo**, rồi vào **Bước 1**.
