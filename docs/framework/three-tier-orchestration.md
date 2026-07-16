# Kiến trúc điều phối 3 tầng

> Tách bạch phần **"nghĩ"** (lập kế hoạch + duyệt) khỏi phần **"chạy"** (điều phối + thực thi),
> để phiên chính không phình ngữ cảnh vì chi tiết thực thi, và mỗi việc chạy đúng model/effort cần thiết.

## Sơ đồ

```
Tầng 1 — Người lập kế hoạch (phiên chính · opusplan · Fable 5)   ← phần "NGHĨ"
  hiểu yêu cầu → thiếu đặc tả thì HỎI (AskUserQuestion) → viết đặc tả chi tiết
  (DDL, API, điểm chạm code, tiêu chí chấp nhận) → gắn nhãn route: cho từng việc
  → xuất PLAN.md → DUYỆT kết quả cuối.  Không tự code, không babysit worker.
        │  (PLAN.md đã được người dùng duyệt)
        ▼
Tầng 2 — Người điều phối (agent: coordinator · Opus · low)        ← phần "CHẠY"
  git fetch → tạo nhánh/worktree từng việc → dispatch theo route:
  → nghiệm thu theo tiêu chí chấp nhận → gọi reviewer → tích hợp (migration, rebase)
  → báo cáo tổng hợp về phiên chính.  Không đổi kế hoạch, không tự code, không merge.
        │
        ▼
Tầng 3 — Workers (định tuyến 2 trục: độ phức tạp × độ kín đặc tả)
  route:complex     → complex-implementer  (Opus · high)   phức tạp, còn chỗ tự quyết trong ranh giới brief
  route:spec        → spec-executor        (Opus · low)    phức tạp nhưng đặc tả KÍN — chỉ thi hành
  route:standard    → standard-worker      (Sonnet · med)  việc vừa, đặc tả cụ thể (kế thừa coder cũ)
  route:mechanical  → mechanical-worker    (Haiku)         cơ học theo mẫu/thông báo (kế thừa mechanical cũ)

  reviewer (Sonnet) — hậu kiểm bằng skill code-review sau khi worker xong,
  trước khi phiên chính duyệt cuối.  Không nằm trong bảng route.
```

## Luật cứng theo tầng

- **Tầng 1** không tự chế đặc tả, không route `complex` để né việc hỏi. Thiếu đặc tả → hỏi người dùng.
- **Tầng 2** nhận nguyên văn `PLAN.md`, không đổi kế hoạch/đặc tả, không tự code, không merge. Worker vướng
  đặc tả → **dừng việc đó và báo lên** (không tự vá, không route lại để né).
- **Tầng 3** làm đúng phạm vi route của mình; đặc tả thiếu/mâu thuẫn ở mức chặn việc → dừng và báo coordinator.

## Chọn route (2 trục)

|                  | Đặc tả CÒN hở (cần tự quyết) | Đặc tả KÍN (chỉ thi hành) |
| ---------------- | ---------------------------- | ------------------------- |
| **Phức tạp**     | `complex` (Opus · high)      | `spec` (Opus · low)       |
| **Vừa / cơ học** | `standard` (Sonnet · med)    | `mechanical` (Haiku)      |

## PLAN.md — hợp đồng giữa Tầng 1 và Tầng 2

Mỗi việc trong `PLAN.md` cần: `id`, mô tả, **nhãn `route:`**, đặc tả (DDL/API/điểm chạm code tùy loại),
**tiêu chí chấp nhận**, phụ thuộc/thứ tự. Coordinator thi hành đúng file này; reviewer nghiệm thu theo
tiêu chí chấp nhận trong đó.

## Định nghĩa agent

Xem `.claude/agents/`: `coordinator.md`, `complex-implementer.md`, `spec-executor.md`,
`standard-worker.md`, `mechanical-worker.md`, `reviewer.md`.
