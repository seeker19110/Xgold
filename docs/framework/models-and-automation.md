# MODEL & TỰ ĐỘNG — chọn model, cấu hình opusplan, chế độ chạy tự động

> **Một file duy nhất** cho ba việc liên quan chặt: (1) **chọn model** Claude chạy khung theo quy mô & rủi ro; (2) **cấu hình opusplan** tối ưu token; (3) **chế độ chạy tự động** (sơ đồ + thành phần đã bake).
> Nói về model **chạy Claude Code để làm dự án theo khung này** — KHÔNG phải chọn model *bên trong* sản phẩm bạn xây (cái đó xem kỹ năng `claude-api`).
> Đọc khi: bắt đầu/đổi quy mô dự án, cân nhắc chi phí–chất lượng, hoặc muốn hiểu nhanh hệ thống tự động.

---

## 0. TL;DR — dùng ngay

```bash
# Từ repo khung, copy cấu hình sang dự án của bạn:
bash copy-framework.sh /đường-dẫn/tới/dự-án
```
Script copy `.claude/settings.json` (opusplan) + hooks + agents **thẳng** vào dự án; file cấu hình stack khác vào `_framework-dropins/` để tự merge. Mở phiên Claude Code → chạy khung ở chế độ **opusplan**.

**Chọn nhanh theo quy mô:**

| Quy mô dự án | Nên dùng | Cách đặt |
|---|---|---|
| **Nhỏ** (script, landing, prototype <5k LOC) | **Sonnet 5** | `"model": "claude-sonnet-5"` |
| **Tầm trung → lớn** (10–50k+ LOC) | **opusplan** (mặc định) | *(không đổi gì)* |
| **Rất phức tạp / rủi ro cực cao** | opusplan + nâng riêng lúc cần | `/model claude-fable-5` ở ca khó nhất |

> **Nguyên tắc vàng:** dùng model **rẻ nhất vẫn đạt chất lượng** cho phần lớn công việc; **nâng cấp có chọn lọc** đúng các mốc rủi ro cao mà khung bắt "dừng và hỏi" (CLAUDE.md §9).

---

## 1. opusplan là gì & vì sao tối ưu token

**opusplan không phải một model** — nó là **chế độ** để Claude Code tự phân vai model theo từng đầu việc:

| Đầu việc | Model | Giá /1M input | Tần suất |
|---|---|---|---|
| **Lập kế hoạch / quyết định kiến trúc** (plan mode) | Opus 4.8 | $5 | ~20–30% |
| **Code, sửa file hằng ngày** (execution) | Sonnet 5 | $3 | phần lớn |
| **Tìm kiếm, đọc file, xác minh phiên bản** (subagent) | Haiku 4.5 | $1 | việc cơ học |

→ Opus **chỉ** tốn tiền lúc thực sự cần suy nghĩ; còn lại chạy Sonnet/Haiku.

**So với dùng một model mạnh cho tất cả:**
- **Fable 5 thuần** ($10/1M): mọi token — kể cả đọc file, format, tìm kiếm — tính giá cao nhất → **lãng phí ~60–70%** ("dao mổ trâu thịt gà").
- **Opus 4.8 thuần** ($5/1M): tốt hơn Fable thuần, nhưng vẫn trả giá Opus cho cả việc cơ học Haiku làm được.
- **opusplan**: chỉ trả giá cao ở pha lập kế hoạch → **rẻ hơn Opus thuần, rẻ hơn nhiều so với Fable thuần**, mà vẫn giữ chất lượng đúng chỗ cần.

**Bảng giá tham khảo (2026-07 — xác minh lại trước khi chốt ngân sách):**

| Model | Ngữ cảnh | Giá /1M (in/out) | So Sonnet 5 |
|---|---|---|---|
| Haiku 4.5 | 200K | $1 / $5 | 0.33× (rẻ) |
| Sonnet 5 | 1M | $3 / $15 (GT $2/$10 tới 31/08/2026) | 1× (baseline) |
| Opus 4.8 | 1M | $5 / $25 | 1.67× |
| Fable 5 | 1M (out 128K) | $10 / $50 | 3.3× |

> **Lưu ý bản chất:** `opusplan` đổi model theo **chế độ (plan ⇄ execution)**, KHÔNG "đoán độ khó từng câu". Việc phân tách main (đắt) ↔ subagent (rẻ) mới là cơ chế tự động thực sự. Kết hợp `opusplan` + subagent là cách "tự động tối ưu chi phí" sát nhất hiện có.

---

## 2. Chọn model theo quy mô & rủi ro (các bước quyết định)

### Bước 1 — Xác định quy mô & loại dự án
Loại: web / mobile / backend-API / desktop / CLI-thư viện / data-ML / game / blockchain / monorepo (xem KHUNG-3 PHẦN A0). Quy mô: số màn hình/endpoint, LOC dự kiến, số người dùng, thời gian dự án.

### Bước 2 — Chấm 4 yếu tố rủi ro (mỗi "có" = +1)
1. **Dữ liệu/logic nhạy cảm?** (thanh toán, dữ liệu người dùng thật, quyền phức tạp)
2. **Kiến trúc nhiều đánh đổi?** (chọn giữa nhiều phương án lớn, khó đảo ngược)
3. **Migration schema phá vỡ / breaking change lan rộng?**
4. **Yêu cầu mơ hồ, nhiều cách hiểu, phạm vi dễ phình?**

### Bước 3 — Suy ra model mặc định
- **0–1 điểm** → **Sonnet 5** (hoặc opusplan) cho toàn dự án.
- **2 điểm** → **opusplan** (Sonnet code) + **nâng Opus 4.8** đúng các mốc dính rủi ro.
- **3–4 điểm** → **opusplan** + cân nhắc **Fable 5** cho quyết định kiến trúc khó nhất / GĐ 0–2.

### Bước 4 — Áp chiến lược lai (tầm trung trở lên)
opusplan đã tự làm phần lớn việc này. Khi cần kiểm soát tay tại mốc:

| Giai đoạn / công việc | Model |
|---|---|
| GĐ 0–2: ý tưởng, chọn công nghệ, thiết kế kiến trúc, viết ADR | **Opus 4.8** (Fable 5 nếu rất phức tạp) |
| GĐ 3–7: code tính năng, UI/UX, test, refactor, docs | **Sonnet 5** |
| Cổng trước MERGE: rà bảo mật, migration, breaking change | **Opus 4.8** |
| GĐ 8: xử lý sự cố production, post-mortem; audit lớn | **Opus 4.8** |

### Bước 5 — Ghi quyết định
Ghi model đã chọn + lý do vào **PROGRESS.md** (hoặc ADR nếu coi là quyết định vận hành đáng lưu), kèm **quy tắc nâng cấp** để nhất quán qua các phiên.

### Ba kịch bản mẫu
- **A. Tầm trung, không nhạy cảm** (blog/CMS, dashboard CRUD) → **Sonnet 5**/opusplan xuyên suốt.
- **B. Tầm trung có 1–2 điểm nhạy cảm** (SaaS nhỏ có thanh toán) → **opusplan** + **Opus 4.8** cho luồng thanh toán, migration, rà bảo mật, sự cố.
- **C. Lớn/phức tạp** (nhiều dịch vụ, realtime, dữ liệu nhạy cảm) → **opusplan** + **Fable 5** cho quyết định kiến trúc khó nhất (GĐ 0–2) và phân tích breaking change diện rộng.

---

## 3. Năng lực model theo từng khung/kỹ năng

Dùng để chọn model **đúng đầu việc**, không phải một model cho cả dự án.
**Thang:** ✅✅ xuất sắc · ✅ đủ tốt · 🟡 làm được nhưng nên soát kỹ / cân nhắc nâng · ❌ không nên giao.

| Khung / Kỹ năng | Trọng tâm | Haiku 4.5 | Sonnet 5 | Opus 4.8 | Fable 5 |
|---|---|:--:|:--:|:--:|:--:|
| **KHUNG-1** — 9 giai đoạn + tiêu chuẩn | Kỷ luật giai đoạn, cổng, DoD | 🟡 | ✅ | ✅✅ | ✅✅ |
| **KHUNG-2** — luật AI + chống ảo giác | Tuân luật, không bịa API, đọc file thật | 🟡 | ✅ | ✅✅ | ✅✅ |
| **KHUNG-3** — chọn công nghệ (research-first) | Xác minh phiên bản, trade-off, đề xuất | ❌ | 🟡 | ✅ | ✅✅ |
| **`/consult`** — tư vấn phát triển | Bóc yêu cầu mơ hồ, đề xuất, đánh đổi | 🟡 | ✅ | ✅✅ | ✅✅ |
| **`/bootstrap`** — khởi tạo dự án mới | Dựng nền, cấu hình hàng rào | 🟡 | ✅ | ✅ | ✅ |
| **`/ui-ux`** — thiết kế UI/UX | Design tokens, mobile-first, WCAG AA, 4 trạng thái | 🟡 | ✅✅ | ✅✅ | ✅✅ |
| **`/gate`** — cổng commit/merge | Chạy build/lint/test, đọc diff, rà rác/bí mật | ✅ | ✅✅ | ✅✅ | ✅✅ |
| **`/adr`** — quyết định kiến trúc | So sánh phương án, hệ quả dài hạn | ❌ | 🟡 | ✅✅ | ✅✅ |
| **`/audit-optimize`** — audit & tối ưu | Đo baseline, refactor không đổi hành vi | 🟡 | ✅ | ✅✅ | ✅✅ |
| **`/incident`** — xử lý sự cố production | Giảm thiệt hại, chẩn đoán, post-mortem | ❌ | 🟡 | ✅✅ | ✅✅ |
| **`/audit-full`** — audit toàn diện 12 nhóm | Quét có bằng chứng, xếp ưu tiên toàn cục | ❌ | ✅ | ✅✅ | ✅✅ |
| **`/completion`** — hoàn thiện dự án | Kế hoạch hoàn thiện, vòng hội tụ, Definition of Complete | ❌ | 🟡 | ✅✅ | ✅✅ |
| **quality-supplements** — chống lỗi logic, race/idempotency | Ca biên, tiền tệ, async | 🟡 | 🟡 | ✅✅ | ✅✅ |
| **existing-project-adoption (brownfield)** | Đọc repo, suy ra stack thật, nâng tăng dần | 🟡 | ✅ | ✅✅ | ✅✅ |

**Đọc theo nhóm:**
- **Việc code/UI/cổng thường ngày** → **Sonnet 5 đủ tốt → xuất sắc**, chi phí thấp — ngựa thồ.
- **Việc lý luận sâu / rủi ro cao** (KHUNG-3, `/adr`, `/incident`, chống lỗi logic, audit lớn) → **Opus 4.8 xuất sắc; Sonnet chỉ 🟡** → nâng Opus, hoặc Fable ở ca khó nhất.
- **Việc đơn giản, đơn lẻ** → Haiku gánh phần cổng/kiểm tra máy móc; **không** giao phần lý luận.
- **Fable 5** hầu như luôn ✅✅ nhưng **chênh lệch đáng tiền** chỉ ở nhóm lý luận sâu; việc thường ngày không hơn Sonnet/Opus đủ để bù chi phí gấp 2–3 lần.

---

## 4. Effort & thinking theo tác vụ (tối ưu token thứ 2)

Model là cần thứ nhất; **effort + thinking** là cần thứ hai. Nguyên tắc: **cần suy nghĩ thì max; việc cơ học thì hạ** — đừng để mọi task nhỏ "suy nghĩ 32k token".

> ⚠️ **Giới hạn thật (đã xác minh):** `effortLevel` và `MAX_THINKING_TOKENS` là **session-global** — KHÔNG đặt riêng cho subagent, KHÔNG tự đổi giữa chừng theo task. Cách per-task duy nhất là **đổi thủ công bằng `/effort`** khi chuyển loại việc.

| Cần điều khiển | Giá trị | Đặt ở đâu |
|---|---|---|
| **`effortLevel`** | `low` · `medium` · `high` · `xhigh` | `settings.json` (mặc định) · `/effort <mức>` (runtime) · `--effort` (CLI) |
| **`MAX_THINKING_TOKENS`** | `0` = tắt · số cao (vd `31999`) = suy nghĩ sâu | `env` block trong `settings.json` |

**Mặc định của khung: `effortLevel: "medium"`.** Chủ động nâng/hạ theo tác vụ:

| Loại tác vụ | Effort | Ghi chú |
|---|---|---|
| Tìm kiếm, đọc file, format, đổi tên, sửa 1 dòng | **`low`** | Giao subagent Haiku càng tốt |
| Code tính năng thường, viết test | **`medium`** | Không cần đổi gì |
| **Cần suy nghĩ:** KHUNG-3 chọn công nghệ, `/adr`, `/incident`, rà lỗi logic tinh vi (async race, tiền tệ, idempotency), phân tích breaking change | **`xhigh` + thinking max** | `/effort xhigh` rồi gõ **`ultrathink`** trong prompt |

```bash
/effort xhigh   # vào việc suy nghĩ nặng (kèm "ultrathink" trong câu hỏi)
/effort medium  # xong, quay lại việc thường
/effort low     # việc cơ học hàng loạt (đổi tên, format cả loạt)
```

Tắt hẳn thinking cho việc siêu nhẹ (tùy chọn) — thêm `{ "env": { "MAX_THINKING_TOKENS": "0" } }` vào `settings.json`, bỏ khi quay lại việc cần nghĩ (Fable 5 không tắt được thinking).

Các skill nặng suy nghĩ (`/adr`, `/incident`, `/consult`, `/auto` plan mode) đã có **dòng nhắc 💡** ở đầu: gợi ý nâng `/model claude-fable-5` + `/effort xhigh` đúng pha, rồi hạ lại. Đây là **nhắc**, không tự đổi — Claude Code không có cơ chế tự nâng Fable/effort theo độ khó.

> **Độ ưu tiên:** CLI `--effort` / env `CLAUDE_CODE_EFFORT_LEVEL` **>** `settings.json`. Môi trường chạy (vd Claude Code trên web) có thể set sẵn env → **ghi đè** `settings.json` cho phiên đó. `/effort` lúc chạy luôn thắng.

---

## 5. Chế độ chạy tự động (sơ đồ + thành phần đã bake)

**Một câu:** Tư vấn + Opus lập kế hoạch toàn bộ → bạn duyệt 1 lần → tự động điều phối tới hoàn thành (Sonnet code, Haiku việc phụ, `executor` việc rõ phạm vi), với auto-format + cổng chặn commit đỏ, quyền an toàn, tự nhắc dừng khi gần hết quota 5h, phiên sau "tiếp tục". Kích hoạt: gõ **`/auto`**.

```
                       /auto  (dự án mới hoặc có sẵn)
                                  │
                 ┌────────────────▼──────────────────┐
   PLAN MODE  →  │  OPUS lên kế hoạch TOÀN BỘ          │  research-first; giao Haiku:
   (opusplan)    │  (9 giai đoạn / nâng cấp brownfield)│   • lookup (tìm/đọc)
                 └────────────────┬──────────────────┘   • version-check (xác minh version)
                                  │
                        ┌─────────▼─────────┐
                        │  1 CỔNG PHÊ DUYỆT  │  ← người dùng xác nhận (ExitPlanMode)
                        └─────────┬─────────┘
                                  │  (đã duyệt)
              EXECUTION  →  SONNET 5 viết code, chạy tự động theo kế hoạch
                                  │  (việc rõ phạm vi → subagent executor: cô lập + song song)
   Trong khi chạy, các hook tự động (không cần hỏi):
     • sửa file  → PostToolUse  → auto-format.sh   → dev-task.sh format-file
     • git commit→ PreToolUse   → pre-commit-gate.sh→ dev-task.sh gate (đỏ = CHẶN)
     • hết lượt  → Stop         → usage-guard.sh    → usage-estimate.sh (≥70% → nhắc wind-down)
     • mở phiên  → SessionStart → session-resume.sh → nạp PROGRESS.md + git ("tiếp tục")
                                └ session-guide.sh  → HIỆN gợi ý "làm gì tiếp theo"
                                  │
              Chỉ DỪNG ở: cổng giai đoạn · các mốc §9 · wind-down gần hết quota
```

### Bản kê thành phần

**Model & quyền — `.claude/settings.json`**

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `model` | `opusplan` | Opus khi plan → tự chuyển Sonnet 5 khi thực thi |
| `fallbackModel` | `[sonnet-5, haiku-4-5]` | Dự phòng khi model chính bận |
| `permissions.allow` | Edit/Write/Read, git an toàn, dev-task.sh, test/format/build | Auto-mode chạy không hỏi |
| `permissions.deny` | rm -rf, force push, reset --hard, sudo, chmod 777, đọc .env/secrets | **Deny thắng allow** |
| `hooks` | SessionStart, PreToolUse, PostToolUse, Stop | 4 hook tự động (bảng dưới) |

**Subagent — `.claude/agents/`**

| File | Model | Việc (đúng thế mạnh) |
|---|---|---|
| `lookup.md` | Haiku | Tìm file, grep symbol, định vị định nghĩa/tham chiếu, trích dữ kiện — read-only |
| `version-check.md` | Haiku | Xác minh phiên bản bằng nguồn sống (npm/pypi/node) cho research-first |
| `executor.md` | Sonnet | Việc RÕ PHẠM VI đã bóc tách (test theo spec, boilerplate, cập nhật docs, sửa cơ học nhiều file) — cô lập ngữ cảnh + song song, rút tải khỏi main. Không phải "model rẻ hơn" (cùng Sonnet với pha-code). |

**Hook — `.claude/hooks/`**

| Hook | Sự kiện | Làm gì |
|---|---|---|
| `session-resume.sh` | SessionStart | Nạp PROGRESS.md + git → "tiếp tục" nối lại; xóa marker wind-down |
| `session-guide.sh` | SessionStart | Hiện gợi ý "làm gì tiếp theo"; cảnh báo nếu model không phải opusplan |
| `pre-commit-gate.sh` | PreToolUse(Bash) | `git commit` → chạy cổng; **đỏ = chặn** (bỏ qua: `--no-verify`) |
| `auto-format.sh` | PostToolUse(Edit\|Write) | Tự format đúng file vừa sửa |
| `usage-guard.sh` | Stop | Ước tính % quota 5h; ≥ ngưỡng → nhắc wind-down (1 lần/phiên) |

**Script — `scripts/`**

| Script | Vai trò |
|---|---|
| `dev-task.sh` | **Điểm vào ổn định** `format\|lint\|typecheck\|test\|build\|gate\|format-file`; tự dò stack (node/python/go/rust/make) hoặc theo khai báo; **no-op an toàn** |
| `usage-estimate.sh` | Ước tính % quota 5h = token thật (transcript) ÷ budget khai báo; `% = MAX` theo model |

### Hai file cấu hình bạn tự điền (đã `.gitignore`)

| Copy từ | Thành | Để làm gì | Bắt buộc? |
|---|---|---|---|
| `.claude/project-commands.example.sh` | `.claude/project-commands.sh` | Khai báo lệnh format/lint/test THẬT (nếu tự-dò chưa đúng) | Không — tự dò trước |
| `.claude/usage-budget.example.sh` | `.claude/usage-budget.sh` | Budget token/5h (gợi ý gói **Pro**) để bật ước tính % + nhắc wind-down | Chỉ khi muốn nhắc quota |

Không có 2 file này: dev-task tự dò/no-op an toàn, ước tính quota tự tắt.

### "Mọi dự án đều khác nhau" — giải quyết bằng LỚP TRUNG GIAN
Template hỗ trợ **mọi loại dự án** nên **không hardcode** lệnh (`npm`/`ruff`/`go`…) vào hook/settings:

```
hook (cố định) → scripts/dev-task.sh <task> → ┌ 1) lệnh KHAI BÁO (.claude/project-commands.sh)
                                              ├ 2) TỰ DÒ hệ sinh thái (node/python/go/rust/make)
                                              └ 3) NO-OP (exit 0) nếu chưa có gì
```
Nhờ vậy hook GATE-trước-commit + auto-format bake sẵn mà vẫn đa-loại — vào GĐ 0–2 chọn stack, chỉ cần điền `project-commands.sh`, automation tự có hiệu lực, **không phải sửa hook/settings**.

---

## 6. Áp dụng, tùy chỉnh & kiểm tra

**Áp dụng (mới hoặc có sẵn):**
1. `bash copy-framework.sh /đường-dẫn/tới/dự-án` — copy `.claude/settings.json` + hooks + agents thẳng; file lớp 2 vào `_framework-dropins/`.
2. (tùy chọn) soát `_framework-dropins/`: merge config khớp stack (eslint, prettier, playwright…), hoặc `rm -rf _framework-dropins/` nếu không cần.
3. `git add .claude/ && git commit -m "chore: apply framework config (opusplan)"`.
4. Mở phiên Claude Code → AI nạp `.claude/settings.json`, chạy khung ở chế độ opusplan.

**Đổi model:**
- Dự án nhỏ (tiết kiệm nhất): `{ "model": "claude-sonnet-5", "fallbackModel": ["claude-haiku-4-5"] }`.
- Nâng riêng lúc cần (không đổi file): `/model claude-opus-4-8` hoặc `/model claude-fable-5` cho ca kiến trúc khó nhất — xong quay lại opusplan.

**Tùy chỉnh:**
- Thêm permission: `{ "permissions": { "allow": ["Bash(make *)", "Bash(docker *)", "Bash(kubectl *)"] } }`.
- Bỏ hook không cần: xóa khối `PreToolUse`/`PostToolUse` trong `settings.json`. Xem skill `update-config`.

**Kiểm tra đã áp đúng** (mở phiên lần đầu):
- ✅ Dòng trạng thái hiển thị **"opusplan"** (hoặc Sonnet/Haiku nếu fallback).
- ✅ `session-resume.sh` chạy (đọc PROGRESS.md); `session-guide.sh` in thông báo chế độ.
- ✅ Mỗi lần Edit/Write, file tự format.
- ❌ Nếu sai: `ls -la .claude/settings.json`, `grep '"model"' .claude/settings.json`, đóng/mở lại phiên.

> **Chọn model lúc mở phiên:** picker thường **không** có `opusplan` (là alias chế độ). Chọn **"Default"** để repo tự áp `opusplan`, hoặc gõ **`/model opusplan`**. **Tránh chọn Opus thuần** — chạy Opus cho mọi thứ đốt hết quota 5h (Pro ~1h). `session-guide.sh` tự đọc model phiên và cảnh báo nếu bị chọn đè.

---

## 7. Ranh giới & sự thật kỹ thuật (trung thực)

- **opusplan** đổi model theo **chế độ** (plan⇄execution), không "đoán độ khó từng câu". Phân tách main (đắt) ↔ subagent (rẻ) mới là cơ chế tự động thực sự.
- **`executor` cùng Sonnet** với pha-code opusplan — lợi ích là **cô lập ngữ cảnh + song song**, không phải model rẻ hơn.
- Claude Code **không** cấp % quota 5h cho hook/agent → % là **ước tính tự hiệu chỉnh** (token thật ÷ budget khai báo), chỉ tính **phiên hiện tại**.
- "Dừng ở ~70%" = **ngừng khởi động chu kỳ mới** rồi wind-down (commit phần xong + ghi PROGRESS), **không** chặn lệnh commit — near-limit càng phải lưu việc.
- **Quyền:** allow-list an toàn; thao tác nguy hiểm vẫn hỏi. Muốn bỏ mọi xác nhận → tự chạy chế độ bypass (cân nhắc rủi ro), không bake vào template.
- Auto-format/gate **đa-loại dự án** nhờ mọi lệnh nằm sau `dev-task.sh`; template không hardcode lệnh stack nào. Hook cần `scripts/dev-task.sh`; thiếu thì no-op (không lỗi).
- **Đừng downgrade ở chỗ rủi ro cao** — chi phí một quyết định kiến trúc/bảo mật sai lớn hơn nhiều tiền tiết kiệm model. Khung §9 liệt kê đúng chỗ nên dùng model mạnh.
- **Haiku 4.5 không dùng làm model chính** — thiếu chiều sâu lý luận đa vai trò; chỉ hợp việc phụ, đơn lẻ.
- **Ngữ cảnh 1M** ở Sonnet/Opus/Fable đủ cho gần như mọi dự án; **chất lượng lý luận** mới là yếu tố quyết định giữa ba model, không phải ngữ cảnh.

---

## 8. Q&A nhanh

- **opusplan có phải model không?** Không — là **chế độ** phân vai Opus (plan) / Sonnet (code) / Haiku (subagent). Đó là lý do nó tối ưu token.
- **Sao không để Fable 5 mặc định cho chắc?** "Dao mổ trâu thịt gà": Fable tính $10/1M mọi token (kể cả việc Haiku $1 làm được) → lãng phí ~60–70%. Nâng Fable **có chọn lọc** đúng ca kiến trúc khó nhất mới đáng.
- **Dự án nhỏ có nên opusplan?** Không bắt buộc. <5k LOC → Sonnet 5 đủ tốt và rẻ hơn.
- **Tương thích mọi loại dự án?** Có. Permissions phủ Node/Python/Go/Rust/Makefile; hooks không phụ thuộc stack (thiếu `dev-task.sh` thì no-op).
- **Nhiều dự án nhiều cấu hình?** Để nhiều file cạnh nhau: `.claude/settings-sonnet.json`, `.claude/settings-shared-opusplan.json` → `cp … .claude/settings.json` khi đổi.

---

> **Kết luận cho dự án tầm trung:** **opusplan là điểm ngọt** — Opus lập kế hoạch, Sonnet code, Haiku/subagent việc phụ; đủ năng lực cho gần như toàn bộ khung với chi phí thấp. **Nâng Opus/Fable có chọn lọc** ở các mốc kiến trúc / bảo mật / migration. Nếu cần chọn model **cho tính năng AI bên trong sản phẩm** → đó là việc khác, dùng kỹ năng `claude-api`.
