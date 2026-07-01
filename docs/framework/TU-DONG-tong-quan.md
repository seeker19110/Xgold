# TỰ ĐỘNG — Tổng quan hệ thống (bản gói để bàn giao)

> Một trang bản đồ toàn bộ **chế độ chạy tự động** đã dựng cho khung này: model tự chọn theo việc, việc rẻ giao Haiku, tự format + chặn commit đỏ, ước tính quota 5h + nhắc wind-down, và resume phiên bằng "tiếp tục".
> Chi tiết lý do & bảng so sánh model ở `CHON-MODEL-cho-du-an.md`. File này là **sơ đồ + cách dùng**.

---

## 1. Một câu tóm tắt
**Tư vấn + Opus lên kế hoạch toàn bộ → bạn duyệt 1 lần → tự động điều phối tới hoàn thành** (Sonnet viết code, Haiku việc phụ), với **auto-format + cổng chặn commit đỏ**, **quyền an toàn**, **tự nhắc dừng khi gần hết quota 5h**, và **phiên sau "tiếp tục" là chạy tiếp**.

Kích hoạt: gõ **`/tu-dong`** khi mô tả dự án MỚI hoặc bắt đầu trên dự án CÓ SẴN.

---

## 2. Sơ đồ luồng

```
                       /tu-dong  (dự án mới hoặc có sẵn)
                                  │
                 ┌────────────────▼─────────────────┐
   PLAN MODE  →  │  OPUS lên kế hoạch TOÀN BỘ         │  research-first; giao Haiku:
   (opusplan)    │  (9 giai đoạn / nâng cấp brownfield)│   • tra-cuu (tìm/đọc)
                 └────────────────┬─────────────────┘   • kiem-tra-phien-ban (xác minh version)
                                  │
                        ┌─────────▼─────────┐
                        │  1 CỔNG PHÊ DUYỆT  │  ← người dùng xác nhận (ExitPlanMode)
                        └─────────┬─────────┘
                                  │  (đã duyệt)
              EXECUTION  →  SONNET 5 viết code, chạy tự động theo kế hoạch
                                  │
   Trong khi chạy, các hook tự động (không cần hỏi):
     • sửa file  → PostToolUse  → auto-format.sh   → dev-task.sh format-file
     • git commit→ PreToolUse   → pre-commit-gate.sh→ dev-task.sh gate (đỏ = CHẶN)
     • hết lượt  → Stop         → usage-guard.sh    → usage-estimate.sh (≥70% → nhắc wind-down)
     • mở phiên  → SessionStart → session-resume.sh → nạp PROGRESS.md + git ("tiếp tục")
                                └ session-guide.sh  → HIỆN gợi ý "làm gì tiếp theo" cho người dùng
                                  │
              Chỉ DỪNG ở: cổng giai đoạn · các mốc §9 · wind-down gần hết quota
```

---

## 3. Các thành phần (bản kê đầy đủ)

### Model & quyền — `.claude/settings.json`
| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `model` | `opusplan` | Opus khi plan → **tự chuyển Sonnet 5** khi thực thi |
| `fallbackModel` | `[sonnet-5, haiku-4-5]` | Dự phòng khi model chính bận |
| `permissions.allow` (35) | Edit/Write/Read, git an toàn, dev-task.sh, test/format/build | Auto-mode chạy không hỏi |
| `permissions.deny` (13) | rm -rf, git push --force, reset --hard, sudo, chmod 777, đọc .env/secrets | **Deny thắng allow**; nguy hiểm vẫn bị chặn |
| `hooks` | SessionStart, PreToolUse, PostToolUse, Stop | 4 hook tự động (bảng dưới) |

### Subagent Haiku — `.claude/agents/`
| File | Việc (đúng thế mạnh Haiku) |
|---|---|
| `tra-cuu.md` | Tìm file, grep symbol, định vị định nghĩa/tham chiếu, trích dữ kiện — read-only |
| `kiem-tra-phien-ban.md` | Xác minh phiên bản bằng nguồn sống (npm/pypi/node) cho research-first |

### Hook — `.claude/hooks/`
| Hook | Sự kiện | Làm gì |
|---|---|---|
| `session-resume.sh` | SessionStart | Nạp PROGRESS.md + git vào ngữ cảnh (model) → "tiếp tục" nối lại; xóa marker wind-down |
| `session-guide.sh` | SessionStart | **Hiện cho người dùng** (`systemMessage`) gợi ý "nên làm gì tiếp theo" tùy trạng thái (chưa có tiến độ → bắt đầu; đang làm → tiếp tục) |
| `pre-commit-gate.sh` | PreToolUse(Bash) | `git commit` → chạy cổng; **đỏ = chặn** (bỏ qua: `--no-verify`) |
| `auto-format.sh` | PostToolUse(Edit\|Write) | Tự format đúng file vừa sửa |
| `usage-guard.sh` | Stop | Ước tính % quota 5h; ≥ ngưỡng → nhắc wind-down (1 lần/phiên) |

### Script — `scripts/`
| Script | Vai trò |
|---|---|
| `dev-task.sh` | **Điểm vào ổn định** `format\|lint\|typecheck\|test\|build\|gate\|format-file`; tự dò stack (node/python/go/rust/make) hoặc theo khai báo; **no-op an toàn** |
| `usage-estimate.sh` | Ước tính % quota 5h = token thật (transcript) ÷ budget khai báo; `% = MAX` theo model |

### Lệnh & tài liệu
- `.claude/commands/tu-dong.md` — playbook "Opus plan → duyệt → auto".
- `PROGRESS.md` — có mục **"Bàn giao phiên"** cho wind-down/resume.
- `CHON-MODEL-cho-du-an.md` — lý do chọn model + chi tiết cấu hình.

---

## 4. Hai file cấu hình bạn tự điền (đã `.gitignore`)

| Copy từ | Thành | Để làm gì | Bắt buộc? |
|---|---|---|---|
| `.claude/project-commands.example.sh` | `.claude/project-commands.sh` | Khai báo lệnh format/lint/test THẬT của dự án (nếu tự-dò chưa đúng) | Không — tự dò trước |
| `.claude/usage-budget.example.sh` | `.claude/usage-budget.sh` | Budget token/5h (đã có gợi ý **gói Pro**) để bật ước tính % + nhắc wind-down | Chỉ khi muốn nhắc quota |

Không có 2 file này: dev-task tự dò/no-op an toàn, và tính năng ước tính quota tự tắt.

---

## 5. Bật nhanh
```bash
# (tùy chọn) bật ước tính quota 5h — đã điền sẵn gợi ý gói Pro
cp .claude/usage-budget.example.sh .claude/usage-budget.sh
# (tùy chọn) khai báo lệnh dự án nếu tự-dò chưa đúng
cp .claude/project-commands.example.sh .claude/project-commands.sh
```
Rồi mở phiên Claude Code trong repo và gõ `/tu-dong`. Xong.

> **Chọn model lúc mở phiên:** picker thường **không** có `opusplan` (là alias chế độ). Chọn **"Default"** để repo tự áp `opusplan` (Opus plan → Sonnet code), hoặc gõ **`/model opusplan`** trong phiên. **Tránh chọn Opus thuần** — chạy Opus cho mọi thứ sẽ đốt hết quota 5h (Pro ~1h).
> **Tự xác nhận + cảnh báo + dẫn chuyển:** thông báo mở phiên (`session-guide.sh`) đọc model phiên và báo ngay: **✅** nếu đang `opusplan`, **⚠️ CẢNH BÁO** nếu bị picker/UI chọn đè (kèm cách sửa `/model opusplan`), **🔎** nếu không đọc được model → nhắc xác nhận bằng `/model`. Khi **không phải opusplan**, hook còn phát `additionalContext` để **AI chủ động nhắc chuyển sang opusplan và CHỜ xác nhận** trước khi chạy tự động (hook/AI không tự gõ `/model` được — người dùng gõ, AI xác nhận). Nhờ vậy tránh "tưởng đang opusplan mà thực ra không".

---

## 6. Ranh giới & sự thật kỹ thuật (trung thực)
- **opusplan** đổi model theo **chế độ** (plan⇄execution), không "đoán độ khó từng câu".
- Claude Code **không** cấp % quota 5h cho hook/agent → % là **ước tính tự hiệu chỉnh** (token thật ÷ budget bạn khai báo), chỉ tính **phiên hiện tại**.
- "Dừng commit/merge ở ~70%" = **ngừng khởi động chu kỳ mới** rồi wind-down (commit phần xong + ghi PROGRESS), **không** chặn lệnh commit — near-limit càng phải lưu việc.
- **Quyền**: allow-list an toàn; thao tác nguy hiểm vẫn hỏi. Muốn bỏ mọi xác nhận → tự chạy chế độ bypass (cân nhắc rủi ro), không bake vào template.
- Auto-format/gate **đa-loại dự án** nhờ mọi lệnh nằm sau `dev-task.sh`; template không hardcode lệnh stack nào.
