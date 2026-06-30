# Đóng góp

> Dự án vận hành theo bộ khung trong `docs/framework/`. Đọc `CLAUDE.md` (luật vận hành) và
> `docs/framework/KHUNG-1-quy-trinh-va-tieu-chuan.md` (quy trình + cổng) trước khi bắt đầu.

## Trước khi bắt đầu một việc (Definition of Ready)

Một task chỉ nên BẮT ĐẦU khi: có tiêu chí chấp nhận rõ ràng đo được · không còn câu hỏi mở · đã
xác định phụ thuộc · thiết kế/luồng đủ rõ · phạm vi gói gọn trong một PR. (Chi tiết: Nhóm 1, mục 7.)

## Quy trình Git

- Mỗi tính năng/sửa lỗi **một nhánh riêng**: `feat/...`, `fix/...`, `refactor/...`, `docs/...`.
- Commit nhỏ, mỗi commit một thay đổi logic.
- **Conventional commits** bắt buộc (commitlint chặn nếu sai): `feat`, `fix`, `refactor`, `docs`,
  `test`, `chore`, `style`, `perf`. Nêu rõ "cái gì" + "tại sao".
- **Mọi merge qua Pull Request** (kể cả làm một mình) · **CI xanh mới merge** · **không push thẳng `main`**.

## Cổng trước khi commit (chạy và đạt hết)

```bash
npm run lint && npm run type-check && npm run format:check && npm run test:coverage && npm run build
```

Ngoài ra: tự đọc lại diff · xóa code rác/`console.log` debug · không bí mật trong code · mọi input đã
validate · mọi thao tác có thể lỗi đã xử lý. Xuất **Báo cáo xác thực** (KHUNG 2) trước khi commit/merge.

## Cổng trước khi merge (thêm)

Toàn bộ test (gồm **E2E Playwright**) xanh · nhánh đã cập nhật với `main`, không xung đột · đối chiếu đủ
**tiêu chí chấp nhận** + **Definition of Done** (checklist trong PR template) · smoke test luồng chính trên
Preview · rà soát bảo mật · nếu đổi schema: migration có phiên bản + đường rollback, RLS đã test.

## Hàng rào tự động (đừng vô hiệu hóa)

pre-commit (lint/format/type) · commit-msg (commitlint) · CI (lint/type/format/test+coverage/build/audit/E2E)
· Lighthouse CI · CodeQL · gitleaks · branch protection trên `main`.
