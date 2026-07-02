---
description: Chạy tự động — Opus lên kế hoạch TOÀN BỘ (plan mode) rồi thực thi tự động (Sonnet code + Haiku việc phụ), qua các cổng của khung. Dùng khi mô tả dự án MỚI hoặc bắt đầu làm trên dự án CÓ SẴN.
---

Bạn vận hành ở chế độ **"Opus lên kế hoạch — chạy tự động"**. Áp dụng khi: người dùng **mô tả một dự án/tính năng mới**, hoặc bắt đầu **làm việc trên một repo có sẵn**.

> Nền model: repo đặt mặc định `opusplan` (`.claude/settings.json`) → **Plan Mode dùng Opus** (lý luận/kiến trúc), **thực thi tự chuyển Sonnet 5** (viết code). Việc tra cứu/xác minh phiên bản giao **subagent Haiku** (`lookup`, `version-check`). Đây là lý do "Opus cao nhất lên kế hoạch rồi chạy tự động" hoạt động mà không phải đổi model tay.

> 💡 **Model/effort:** Plan Mode đã tự dùng **Opus** (không cần đổi tay). Chỉ khi quyết định kiến trúc **cực khó / nhiều đánh đổi khó đảo**, cân nhắc nâng thêm `/model claude-fable-5` + `/effort xhigh` cho riêng pha lập kế hoạch; xong quay lại `opusplan` + `/effort medium` để pha thực thi (Sonnet/Haiku) khỏi phí token. Chi tiết: `docs/framework/models-and-automation.md` §4 (Effort & thinking).

## Bước 1 — LẬP KẾ HOẠCH TOÀN BỘ bằng Opus (trong Plan Mode)
Vào **plan mode** (Opus). Trước khi lập kế hoạch, **nghiên cứu thật** (không bịa):
- **Dự án MỚI (greenfield):** theo `/consult` + KHUNG-3 — phân loại loại dự án → chọn hồ sơ → **xác minh phiên bản bằng nguồn sống** (giao subagent `version-check`) → đề xuất stack. Bám 9 giai đoạn KHUNG-1.
- **Dự án CÓ SẴN (brownfield):** theo `existing-project-adoption.md` — **đọc repo để biết stack thật** (giao subagent `lookup`), KHÔNG áp stack mặc định; đề xuất nâng cấp tăng dần.

Kế hoạch phải bao trùm: mục tiêu & phạm vi (DoR), các giai đoạn/cột mốc, việc chia nhỏ kiểm tra được, rủi ro + cách giảm, tiêu chí chấp nhận + DoD, điểm cần "dừng và hỏi" (CLAUDE.md §9), và **các cổng** giữa giai đoạn.

## Bước 2 — CHỐT KẾ HOẠCH (một cổng phê duyệt)
Trình kế hoạch đầy đủ để người dùng duyệt (ExitPlanMode). Đây là **cổng phê duyệt DUY NHẤT bắt buộc** trước khi chạy — vừa theo Plan Mode của Claude Code, vừa theo cổng giai đoạn của khung. **Không tự thực thi khi chưa được duyệt.**

## Bước 3 — THỰC THI TỰ ĐỘNG (Sonnet + Haiku)
Sau khi duyệt, chạy **tự động** theo kế hoạch, không hỏi lại từng bước:
- **Sonnet 5** viết code theo từng phần nhỏ, hoàn chỉnh, kiểm tra được.
- Giao **subagent Haiku** các việc cơ học: tìm file/định vị (`lookup`), xác minh phiên bản (`version-check`).
- Giao **subagent Sonnet `executor`** các việc RÕ PHẠM VI đã bóc tách (viết test theo spec, sinh boilerplate, cập nhật docs, sửa cơ học nhiều file) → cô lập ngữ cảnh + chạy song song, rút tải khỏi phiên chính. Việc kiến trúc/bảo mật/breaking change vẫn giữ ở phiên chính.
- **Tự động chất lượng đã bật:** auto-format khi sửa file, **cổng chặn `git commit` khi đỏ** (`.claude/hooks/`), qua `scripts/dev-task.sh`. Điền `.claude/project-commands.sh` (copy từ `.example.sh`) nếu dự án có lệnh riêng.
- Cập nhật `PROGRESS.md` sau mỗi mốc; commit theo conventional commits.

## WIND-DOWN ở ~70% giới hạn 5h + RESUME phiên sau
> **Sự thật kỹ thuật (đã xác minh):** Claude Code **KHÔNG** cấp % giới hạn 5h cho hook/agent (không env var, không field). Nên **không có cổng máy móc** đọc đúng "70% của 5h". Thực thi bằng **hành vi wind-down + hạ tầng resume** dưới đây.

**Tín hiệu tự động:** nếu đã khai báo `.claude/usage-budget.sh`, **Stop hook** (`usage-guard.sh`) sau mỗi lượt tự ước tính % quota 5h (token thật từ transcript ÷ budget của bạn) và **tự nhắc wind-down khi ≥ ngưỡng** (mặc định 70%). Chưa khai báo budget → tín hiệu tắt, dùng phán đoán tay.

**Khi ước lượng đã dùng ~70% cửa sổ 5h** (theo tín hiệu tự động ở trên, hoặc cảnh báo `/usage` của CLI, hoặc phán đoán theo khối lượng):
1. **KHÔNG bắt đầu** đơn vị công việc mới cần commit/merge; **hoàn tất gọn** đơn vị đang dở.
2. **Commit** phần đã xong (qua cổng — không commit code đỏ). Đây là "dừng commit/merge" hiểu đúng: **ngừng khởi động chu kỳ mới**, không phải chặn lệnh commit (near-limit thì càng phải commit để không mất việc).
3. **Cập nhật `PROGRESS.md`** — nhất là mục **"Bàn giao phiên"**: việc vừa xong, việc DỞ ở đâu, **bước kế tiếp cụ thể**.
4. **Dừng phiên sạch sẽ**, báo người dùng: "đã wind-down, phiên sau nhắn *tiếp tục*".

**Phiên sau — người dùng chỉ cần nhắn "tiếp tục":**
- SessionStart hook (`.claude/hooks/session-resume.sh`) đã **tự nạp** PROGRESS.md + git state vào ngữ cảnh.
- Đọc mục **"Đang làm" / "Tiếp theo" / "Bàn giao phiên"** → **nối tiếp đúng chỗ dở**, không lập lại kế hoạch từ đầu (kế hoạch tổng đã duyệt vẫn hiệu lực).

## Ranh giới tự động (BẮT BUỘC — không vượt)
Chạy tự động **KHÔNG** có nghĩa bỏ cổng. **Vẫn dừng và hỏi** khi (CLAUDE.md §9): yêu cầu mơ hồ nhiều cách hiểu; thao tác không thể hoàn tác (xóa dữ liệu, đổi schema phá vỡ); breaking change lan rộng; nhiều đánh đổi lớn; đụng bảo mật/thanh toán/dữ liệu người dùng thật; **hoặc chuyển sang giai đoạn kế** (tóm tắt đã đạt cổng chưa, xin xác nhận). Ngoài các mốc đó → chạy liền mạch.

> Tóm tắt: **1 kế hoạch tổng (Opus) → 1 lần duyệt → thực thi tự động (Sonnet+Haiku) với auto-format + gate**, chỉ dừng ở các cổng/§9. Đây là mức "tự động" cao nhất vẫn an toàn theo khung.
