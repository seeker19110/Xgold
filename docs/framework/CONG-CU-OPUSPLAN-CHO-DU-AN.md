# Cấu hình opusplan dùng chung cho mọi dự án (tối ưu token)

> **Mục đích:** Cung cấp cấu hình Claude Code tiêu chuẩn dùng **opusplan** — cơ chế tự chọn model rẻ-nhất-đủ-dùng cho từng đầu việc, cho bất kỳ dự án nào áp dụng khung CLAUDE.md.
> **Khi nào:** Áp dụng **mặc định** khi tích hợp khung vào dự án (mới hoặc có sẵn). Muốn rẻ hơn nữa (Sonnet 5) hay mạnh hơn (Fable 5) → sửa 1 dòng trong `.claude/settings.json`.

---

## 0. TL;DR — Dùng ngay

```bash
# Từ repo khung, chạy:
bash copy-framework.sh /đường-dẫn/tới/dự-án-của-bạn
```

✅ **Xong!** Script tự động:
- Copy `.claude/settings.json` (opusplan) **thẳng** vào dự án
- Copy `.claude/hooks` và `.claude/agents` (gồm subagent Haiku: `tra-cuu`, `kiem-tra-phien-ban`)
- Copy các file cấu hình khác (eslint, prettier, playwright…) vào `_framework-dropins/` để tự merge

**Kết quả:** Mở phiên Claude Code lần đầu → AI chạy khung ở chế độ **opusplan**, tự dùng model rẻ-nhất-đủ-dùng.

---

## 1. Vì sao opusplan = tối ưu token (không "dao mổ trâu")

**opusplan** không phải một model — nó là **chế độ** để Claude Code tự phân vai model theo từng đầu việc:

| Đầu việc | Model | Giá /1M input | Tần suất |
|---|---|---|---|
| **Lập kế hoạch / quyết định kiến trúc** (plan mode) | Opus 4.8 | $5 | ~20–30% |
| **Code, sửa file hằng ngày** | Sonnet 5 | $3 | phần lớn |
| **Tìm kiếm, đọc file, xác minh phiên bản** (subagent) | Haiku 4.5 | $1 | việc cơ học |

→ Opus **chỉ** tốn tiền lúc thực sự cần suy nghĩ; còn lại chạy Sonnet/Haiku.

**So với dùng một model mạnh cho tất cả:**
- **Fable 5 thuần** ($10/1M): mọi token — kể cả đọc file, format, tìm kiếm — đều tính giá cao nhất → **lãng phí ~60–70%**.
- **Opus 4.8 thuần** ($5/1M): tốt hơn Fable thuần, nhưng vẫn trả giá Opus cho cả việc cơ học Haiku làm được.
- **opusplan**: chỉ trả giá cao ở pha lập kế hoạch → **rẻ hơn Opus thuần, rẻ hơn nhiều so với Fable thuần**, mà vẫn giữ chất lượng ở đúng chỗ cần.

> Nguyên tắc vàng (CLAUDE.md / CHON-MODEL): dùng model **rẻ nhất vẫn đạt chất lượng** cho phần lớn công việc; **nâng cấp có chọn lọc** đúng mốc rủi ro cao.

---

## 2. File cấu hình tiêu chuẩn là gì?

**`.claude/settings.json`** (copy từ `.claude/settings-shared-opusplan.json`):

### Model & effort
- **`"model": "opusplan"`** — Opus lập kế hoạch, Sonnet code, Haiku (subagent) việc phụ.
- **`"fallbackModel": ["claude-sonnet-5", "claude-haiku-4-5"]`** — nếu opusplan không khả dụng, hạ dần Sonnet → Haiku.
- **`"effortLevel": "medium"`** — mức suy luận mặc định cân bằng; nâng `xhigh` khi cần suy nghĩ, hạ `low` cho việc cơ học (xem §3b).

### Permissions
- **Read/Edit/Write:** chỉnh sửa file
- **Bash git:** add, commit, push, fetch…
- **Bash build/test:** npm/pnpm/yarn/pytest/go/cargo… (qua `scripts/dev-task.sh`)
- **Deny:** chặn thao tác nguy hiểm (rm -rf, force push, sudo, đọc `.env`)

### Hooks
- **SessionStart:** nạp PROGRESS.md + hướng dẫn phiên
- **PreToolUse (Bash):** cổng pre-commit
- **PostToolUse (Edit/Write):** auto-format file vừa sửa
- **Stop:** guard cảnh báo dùng nhiều token

### Subagent Haiku (mấu chốt tối ưu token)
`.claude/agents/` có 2 subagent chạy **Haiku 4.5** cho việc cơ học:
- `tra-cuu` — tìm file, grep symbol, đọc trích dữ kiện
- `kiem-tra-phien-ban` — xác minh phiên bản gói bằng nguồn sống

→ Giao việc cơ học cho Haiku = giữ Opus/Sonnet cho việc cần suy nghĩ.

---

## 3. Chọn model theo quy mô dự án

**Mặc định là opusplan** — cân bằng tốt cho đa số dự án. Chỉ đổi khi có lý do:

| Quy mô dự án | Nên dùng | Cách đặt |
|---|---|---|
| **Nhỏ** (script, landing, <5k LOC) | **Sonnet 5** | `"model": "claude-sonnet-5"` |
| **Tầm trung → lớn** (10–50k+ LOC) | **opusplan** (mặc định) | *(không đổi gì)* |
| **Rất phức tạp / rủi ro cực cao** | opusplan + nâng riêng lúc cần | `/model claude-fable-5` khi gặp trade-off khó nhất |

### Đổi sang Sonnet 5 (dự án nhỏ, tiết kiệm nhất)
```json
{
  "model": "claude-sonnet-5",
  "fallbackModel": ["claude-haiku-4-5"]
}
```

### Nâng riêng lên Opus/Fable lúc cần (không đổi file)
```bash
/model claude-opus-4-8   # hoặc claude-fable-5 cho ca kiến trúc khó nhất
```
Dùng khi đang ở KHUNG-3 (chọn công nghệ), `/adr`, `/su-co`, hay rà lỗi logic tinh vi — xong quay lại opusplan.

---

## 3b. Effort & thinking theo tác vụ (tối ưu token thứ 2)

Model là cần thứ nhất; **effort + thinking** là cần thứ hai. Nguyên tắc: **cần suy nghĩ thì max; việc cơ học thì hạ** — đừng để mọi task nhỏ đều "suy nghĩ 32k token".

> ⚠️ **Giới hạn thật (đã xác minh với tài liệu):** `effortLevel` và `MAX_THINKING_TOKENS` là **session-global** — KHÔNG đặt riêng được cho subagent, KHÔNG tự đổi giữa chừng theo task. Cách per-task duy nhất là **đổi thủ công bằng `/effort`** khi chuyển sang loại việc khác.

### Hai cần điều khiển
| Cần | Giá trị | Đặt ở đâu |
|---|---|---|
| **`effortLevel`** | `low` · `medium` · `high` · `xhigh` | `settings.json` (mặc định) · `/effort <mức>` (runtime) · `--effort` (CLI) |
| **`MAX_THINKING_TOKENS`** | `0` = tắt thinking · số cao (vd `31999`) = suy nghĩ sâu | `env` block trong `settings.json` |

### Mặc định của khung: `effortLevel: "medium"`
Cân bằng cho đa số việc code hằng ngày. **Chủ động nâng/hạ** theo tác vụ:

| Loại tác vụ | Effort | Ghi chú |
|---|---|---|
| Tìm kiếm, đọc file, format, đổi tên, sửa 1 dòng | **`low`** | Giao subagent Haiku càng tốt (rẻ nhất) |
| Code tính năng thường, viết test | **`medium`** (mặc định) | Không cần đổi gì |
| **Cần suy nghĩ:** KHUNG-3 chọn công nghệ, `/adr`, `/su-co`, rà lỗi logic tinh vi (async race, tiền tệ, idempotency), phân tích breaking change | **`xhigh` + thinking max** | `/effort xhigh` rồi gõ **`ultrathink`** trong prompt |

### Cách đổi nhanh
```bash
# Vào việc suy nghĩ nặng:
/effort xhigh
# … kèm từ khoá "ultrathink" (hoặc "think hard") trong câu hỏi để mở rộng thinking budget.

# Xong, quay lại việc thường (tiết kiệm token):
/effort medium

# Việc cơ học hàng loạt (vd đổi tên, format cả loạt file):
/effort low
```

### Tắt hẳn thinking cho việc siêu nhẹ (tuỳ chọn)
Chạy loạt việc máy móc, muốn rẻ tối đa → thêm vào `.claude/settings.json`:
```json
{ "env": { "MAX_THINKING_TOKENS": "0" } }
```
(Bỏ dòng này khi quay lại việc cần suy nghĩ. Lưu ý: Fable 5 không tắt được thinking.)

### Nhắc sẵn trong các skill lý luận sâu
Các skill nặng về suy nghĩ — `/adr`, `/su-co` (pha tìm nguyên nhân), `/tu-van` (chọn công nghệ), `/tu-dong` (plan mode) — đã có **dòng nhắc 💡** ở đầu: gợi ý nâng `/model claude-fable-5` + `/effort xhigh` đúng pha cần, rồi hạ lại. Đây là **nhắc**, không tự đổi model — bạn (hoặc AI) vẫn quyết thủ công. Claude Code không có cơ chế tự nâng Fable/effort theo độ khó.

> **Độ ưu tiên:** CLI `--effort` / env `CLAUDE_CODE_EFFORT_LEVEL` **>** `settings.json`. Môi trường chạy (vd Claude Code trên web) có thể đã set sẵn env effort/thinking → **ghi đè** giá trị trong `settings.json` cho phiên đó. Đổi bằng `/effort` lúc chạy luôn thắng.

---

## 4. Áp dụng cấu hình cho dự án (mới hoặc có sẵn)

1. Từ repo khung, copy sang dự án:
   ```bash
   bash copy-framework.sh /đường-dẫn/tới/dự-án
   ```
   ✅ Script copy `.claude/settings.json` (opusplan) + hooks + agents thẳng vào dự án; các file lớp 2 khác vào `_framework-dropins/`.

2. Vào dự án, (tùy chọn) soát `_framework-dropins/`:
   - Merge config khớp stack (eslint, prettier, playwright…), hoặc `rm -rf _framework-dropins/` nếu không cần.

3. Commit:
   ```bash
   git add .claude/ && git commit -m "chore: apply framework config (opusplan)"
   ```

4. Mở phiên Claude Code → AI nạp `.claude/settings.json` và chạy khung ở chế độ opusplan 🎉

---

## 5. Tuỳ chỉnh cho dự án đặc thù

### Thêm permission (vd make/docker/kubectl)
```json
{ "permissions": { "allow": [ "Bash(make *)", "Bash(docker *)", "Bash(kubectl *)" ] } }
```

### Bỏ hook không cần
```json
{ "hooks": { "SessionStart": [...], "Stop": [...] } }
// Bỏ PreToolUse/PostToolUse nếu dự án không cần cổng/auto-format
```

Xem skill `update-config` (trong CLAUDE.md) để thêm hook tùy chỉnh.

---

## 6. Kiểm tra cấu hình đã áp đúng

Khi mở phiên Claude Code lần đầu:

✅ **Đúng khi:**
1. Dòng trạng thái hiển thị **"opusplan"** (hoặc Sonnet/Haiku nếu fallback)
2. Hook `session-resume.sh` chạy (đọc PROGRESS.md)
3. Hook `session-guide.sh` in thông báo chế độ chạy
4. Mỗi lần Edit/Write, file tự format (`auto-format.sh`)

❌ **Nếu sai:**
- `ls -la .claude/settings.json` — file có tồn tại?
- `grep '"model"' .claude/settings.json` — model đúng chưa?
- Đóng/mở lại phiên (reload cấu hình); kiểm tra `.claude/hooks/` có mặt

---

## 7. Q&A

### Q: opusplan có phải là model không?
**A:** Không — là **chế độ** để Claude Code tự phân vai Opus (plan) / Sonnet (code) / Haiku (subagent phụ). Đây là lý do nó tối ưu token: không dùng một model đắt cho mọi việc.

### Q: Tại sao không để Fable 5 làm mặc định cho chắc?
**A:** Vì đó là "dao mổ trâu thịt gà". Fable 5 tính $10/1M **mọi token** — kể cả đọc file, format, tìm kiếm (việc Haiku $1 làm được). Lãng phí ~60–70% mà đa số việc không cần tới sức mạnh đó. Nâng Fable **có chọn lọc** (`/model claude-fable-5`) đúng ca kiến trúc khó nhất mới đáng tiền.

### Q: Dự án nhỏ có nên dùng opusplan?
**A:** Không bắt buộc. Script, landing, prototype (<5k LOC) → **Sonnet 5** đủ tốt và rẻ hơn. Đổi `"model": "claude-sonnet-5"`.

### Q: File này có tương thích mọi loại dự án không?
**A:** Có. Permissions phủ Node/Python/Go/Rust/Makefile; hooks không phụ thuộc stack. Hook cần `scripts/dev-task.sh`; thiếu thì no-op (không lỗi). Web / mobile / backend / desktop / CLI / data-ML / game / blockchain / monorepo đều chạy được.

### Q: Chi phí các model?
**A:** Giá tham khảo (2026-07):

| Model | Giá /1M (in/out) | So Sonnet 5 |
|---|---|---|
| Haiku 4.5 | $1 / $5 | 0.33× (rẻ) |
| Sonnet 5 | $3 / $15 | 1× (baseline) |
| Opus 4.8 | $5 / $25 | 1.67× |
| Fable 5 | $10 / $50 | 3.3× |

opusplan trộn 3 model đầu → **chi phí thực tế thường thấp hơn Opus thuần**, vì Opus chỉ dùng ở pha lập kế hoạch.

### Q: Nhiều dự án nhiều cấu hình khác nhau — làm sao?
**A:** Để nhiều file cạnh nhau rồi copy cái cần:
- `.claude/settings-sonnet.json` (nhỏ) · `.claude/settings-shared-opusplan.json` (tầm trung+)
- `cp .claude/settings-sonnet.json .claude/settings.json` khi muốn đổi.

---

## 8. Tiếp theo

1. ✅ Commit `.claude/settings.json` vào git
2. ✅ Mở phiên Claude Code, mô tả dự án → AI tự chạy khung
3. ✅ Brownfield: đọc `AP-DUNG-vao-du-an-co-san.md` · Greenfield: đọc `KHOI-TAO-du-an-moi.md`
4. ✅ Cân nhắc model theo quy mô: `CHON-MODEL-cho-du-an.md`
