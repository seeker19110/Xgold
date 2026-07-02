# PROGRESS.md — Trạng thái dự án

> Cập nhật sau mỗi mốc đáng kể. AI đọc file này để biết đang ở đâu.

## Giai đoạn hiện tại
- GĐ 7 — Hoàn thiện công cụ/khung (tối ưu cấu hình, hướng dẫn tích hợp)

## Đã xong
- ✅ Tạo cấu hình Opusplan tiêu chuẩn (`.claude/settings-shared-opusplan.json`) — dùng chung cho mọi dự án
- ✅ Cập nhật `copy-framework.sh` để copy cấu hình Opusplan vào `_framework-dropins/`
- ✅ Cập nhật `copy-framework.ps1` tương tự cho Windows
- ✅ Viết hướng dẫn chi tiết (`CONG-CU-OPUSPLAN-CHO-DU-AN.md`) về cách sử dụng & tuỳ chỉnh cấu hình
- ✅ **Copy thẳng:** Cấu hình tự động copy vào `.claude/settings.json` (không cần chọn merge)
- ✅ **Chốt chiến lược tối ưu token:** giữ **opusplan** (Opus lập kế hoạch, Sonnet code, Haiku phụ)
      — KHÔNG dùng Fable 5 thuần (đắt, "dao mổ trâu"); Fable/Opus chỉ nâng có chọn lọc lúc cần
- ✅ Push lên nhánh `claude/opusplan-shared-config-rm5ru6`, PR #19
- ✅ **Thêm subagent Sonnet `thuc-thi`** (`.claude/agents/thuc-thi.md`) — nhận việc RÕ PHẠM VI đã bóc tách
      (viết test theo spec, boilerplate, cập nhật docs, sửa cơ học nhiều file) để rút tải khỏi main Opus.
      Đồng bộ mô tả trong CHON-MODEL, TU-DONG-tong-quan, CONG-CU-OPUSPLAN, copy-framework.sh/.ps1, /tu-dong.

- ✅ **Gộp 3 doc model/tự động → 1** (`docs/framework/MODEL-va-TU-DONG.md`): gộp CHON-MODEL +
      CONG-CU-OPUSPLAN + TU-DONG-tong-quan, khử trùng lặp (594→~360 dòng, −2 file). Cập nhật mọi
      tham chiếu: CLAUDE.md, `/adr` `/su-co` `/tu-van` `/tu-dong`, session-guide.sh.
- ✅ **Quyết định giữ scaffold web** (Next.js+Supabase) làm hồ sơ mặc định — không tách/xóa.
- ✅ PR #21 đã merge vào `main` (`main` = branch, 0/0).
- ✅ **Codify quy trình PR → merge tự động** vào CLAUDE.md §8: sau khi tạo PR thì đăng ký theo dõi + đặt lịch 3 phút, CI xanh thì squash-merge vào `main`, luôn quay về `main`, **FIFO không nhảy cóc** (PR tạo trước merge trước).
- ✅ **Thêm tính năng audit toàn diện** (`/audit-toan-dien`, khác `/audit-toi-uu` chỉ tối ưu mã nguồn):
      - `docs/ops/audit-toan-dien-prompt.md` — playbook 11 nhóm (kiến trúc, bảo mật, chất lượng mã/
        chống lỗi logic, test/coverage, hiệu năng, a11y/UI-UX, dependency, CI/CD/vận hành, tài liệu
        đồng bộ, dữ liệu/migration, cấu hình & bí mật), quy trình 2 giai đoạn (quét → dừng chờ duyệt
        → xử lý qua `/cong`).
      - `.claude/commands/audit-toan-dien.md` — slash command, có bước bắt buộc hỏi người dùng
        "quét lại từ đầu hay tiếp tục" dựa vào `docs/ops/AUDIT-TOAN-DIEN-TRANG-THAI.md` (file trạng
        thái tạo tại dự án đích, cập nhật ngay sau mỗi nhóm để resume được qua nhiều phiên).
      - Cập nhật `CLAUDE.md` §1 (TRIGGER mới), `copy-framework.sh`/`.ps1` (liệt kê lệnh mới khi copy khung).
- ✅ PR #23 tạo (draft) cho nhánh `claude/project-audit-feature-2jyw07`.
- ✅ **Bổ sung "Bước -1" vào `audit-toan-dien-prompt.md` + slash command:** trước khi quét, AI phải
      xác nhận đây là **dự án cụ thể đã phát triển** (tính năng + công nghệ đã chọn/triển khai thật),
      không phải bộ khung/template còn trống — repo `project-template` này hiện chính là khung trống
      (PROJECT.md chưa điền, `app/` chỉ có file scaffold hệ thống). Nếu vẫn là khung trống → AI phải
      DỪNG và giải thích rõ, không bịa kế hoạch/phát hiện audit cho tính năng chưa tồn tại (đúng
      nguyên tắc chống ảo giác CLAUDE.md §4). Ghi nhận từ phản hồi người dùng: khung này dùng để áp
      lên dự án khác hoặc phát triển tiếp từ đây — audit toàn diện chỉ có ý nghĩa khi đã có dự án cụ thể.

- ✅ **Tái cấu trúc repo — tên file sang TIẾNG ANH** (nội dung vẫn tiếng Việt), người dùng chốt:
      - `docs/framework/`: KHUNG-1/2/3 → `01-process-and-standards.md` / `02-ai-rules-and-project-template.md`
        / `03-tech-selection-and-proactive-advice.md`; KHOI-TAO → `new-project-runbook.md`;
        AP-DUNG → `existing-project-adoption.md`; BO-SUNG → `quality-supplements.md`;
        MODEL-va-TU-DONG → `models-and-automation.md`. Thêm `docs/framework/README.md` (chỉ mục + bản đồ tên cũ→mới).
      - `docs/ops/`: audit-toan-dien-prompt → `comprehensive-audit-prompt.md`; audit-toi-uu-prompt →
        `code-optimization-audit-prompt.md`; file trạng thái sinh tại dự án đích: `COMPREHENSIVE-AUDIT-STATUS.md`.
      - Slash commands: `/tu-van`→`/consult` · `/cong`→`/gate` · `/khoi-tao`→`/bootstrap` · `/tu-dong`→`/auto`
        · `/audit-toan-dien`→`/audit-full` · `/audit-toi-uu`→`/audit-optimize` · `/su-co`→`/incident`.
      - Subagents: `tra-cuu`→`lookup` · `kiem-tra-phien-ban`→`version-check` · `thuc-thi`→`executor`.
      - ADR: `0001-chon-stack.md` → `0001-stack-selection.md`. Toàn bộ tham chiếu chéo đã cập nhật
        (đã grep xác minh 0 sót, mọi đường dẫn docs/ được nhắc đều tồn tại).
- ✅ **Lấp 4 gap "hoàn thiện dự án"** (từ phân tích gap theo yêu cầu người dùng):
      - **`docs/framework/project-completion.md` + `/completion`** — playbook 5 pha: dò hiện trạng
        (bản đồ tính năng `docs/FEATURE-MAP.md` + sổ quy ước `docs/CONVENTIONS.md`) → audit 12 nhóm →
        **kế hoạch hoàn thiện chi tiết** (`docs/ops/COMPLETION-PLAN.md`, truy vết F-xxx→W-xxx→PR→bằng chứng,
        dừng chờ duyệt) → thực thi từng đợt qua `/gate` (bug có test tái hiện trước khi sửa) →
        **re-audit hội tụ** (0 phát hiện Cao mở; Trung/Thấp có quyết định ghi nhận) + nghiệm thu theo
        **Definition of Complete** cấp dự án.
      - **Nhóm 12 — Thống nhất chéo tính năng** thêm vào `comprehensive-audit-prompt.md` (logic trùng lặp
        phân kỳ, validation/API/phân quyền/trạng thái UI/quy ước không đồng nhất) + mẫu trạng thái 12 dòng.
      - `existing-project-adoption.md`: Bước 0 thêm FEATURE-MAP + CONVENTIONS; thêm **Bước 4 — hoàn thiện**
        (trỏ `/completion`); cổng "áp khung xong" thêm 2 file này.
      - CLAUDE.md §1 thêm TRIGGER `/completion`; cập nhật session-guide.sh, copy-framework.sh/.ps1,
        README.md, consult.md, models-and-automation.md (bảng model thêm `/audit-full` + `/completion`).

## Đang làm
- (xong — chờ tạo PR cho nhánh `claude/project-planning-refinement-ujgfiy`)

## Tiếp theo
- Theo dõi CI của PR tái cấu trúc, merge khi xanh (CLAUDE.md §8: FIFO, quay về `main` sau merge).
- Cân nhắc: dự án đã copy khung bản cũ → dùng bảng ánh xạ trong `docs/framework/README.md` khi cập nhật.

## Quyết định quan trọng (trỏ tới ADR nếu có)
- Cấu hình Opusplan được thêm vào `_framework-dropins/` (an toàn, không đè cấu hình cũ)
- `.claude/` (hooks + agents) cũng được copy vào `_framework-dropins/` để dự án cũ tự merge nếu cần
- **opusplan là điểm ngọt, không đổi**; tối ưu token thêm bằng CHIA VIỆC (subagent) chứ không "route theo độ khó"
  (Claude Code không có bộ định tuyến model per-query). `thuc-thi` cùng Sonnet với pha-code opusplan —
  lợi ích là **cô lập ngữ cảnh + song song**, không phải model rẻ hơn.

## Nợ kỹ thuật (chỗ "làm tạm" cần quay lại)
- (không có)

## Bàn giao phiên (điền khi WIND-DOWN gần chạm limit 5h — để phiên sau "tiếp tục")
> Chế độ tự động ghi ở đây trước khi dừng: việc vừa xong, việc DỞ ở đâu, bước kế tiếp cụ thể.
- Lần cập nhật: 2026-07-02
- Việc DỞ / bước tiếp theo: PR tái cấu trúc (nhánh `claude/project-planning-refinement-ujgfiy`) — theo dõi CI, merge khi xanh.
- Cần lưu ý khi chạy tiếp: TOÀN BỘ tên file/lệnh đã sang tiếng Anh — tra bản đồ tên cũ→mới ở `docs/framework/README.md`. Doc model/tự động: `docs/framework/models-and-automation.md`. Subagent Sonnet: `.claude/agents/executor.md`.
