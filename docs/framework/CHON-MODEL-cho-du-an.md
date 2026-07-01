# CHỌN MODEL cho dự án (Claude) — hướng dẫn cân nhắc & quyết định

> **Mục đích:** giúp người dùng chọn model Claude phù hợp để **vận hành khung CLAUDE.md** (đa vai trò: kỹ sư cấp cao + quản lý dự án + tư vấn công nghệ + UI/UX + bảo mật/audit).
> **Không phải** hướng dẫn chọn model *bên trong* sản phẩm bạn xây (cái đó xem kỹ năng `claude-api`). File này chỉ nói về **model chạy Claude Code để làm dự án theo khung này**.
> Đọc khi: bắt đầu dự án mới, đổi quy mô dự án, hoặc cân nhắc chi phí/chất lượng.

---

## 0. TL;DR — chọn nhanh

| Quy mô dự án | Mặc định nên chọn | Nâng cấp khi… |
|---|---|---|
| **Nhỏ** (script, CLI nhỏ, landing, prototype) | **Sonnet 5** | — (hiếm khi cần Opus) |
| **Tầm trung** (web/app + backend + CSDL, ~10–50k LOC) | **Sonnet 5** (mặc định) | Nâng **Opus 4.8** ở mốc kiến trúc/bảo mật/migration |
| **Lớn/phức tạp** (nhiều dịch vụ, realtime, dữ liệu nhạy cảm) | **Opus 4.8** | Nâng **Fable 5** cho quyết định kiến trúc khó nhất |
| **Rất phức tạp / rủi ro cao** (thanh toán, multi-region, ML) | **Fable 5** | — (đã là mạnh nhất) |

> **Nguyên tắc vàng:** dùng model **rẻ nhất vẫn đạt chất lượng** cho phần lớn công việc; **nâng cấp có chọn lọc** đúng những mốc rủi ro cao mà khung bắt "dừng và hỏi" (CLAUDE.md §9).

---

## 1. Các model & đặc điểm (tham chiếu nhanh)

| Model | Ngữ cảnh | Giá (input/output /1M) | Thế mạnh cho khung này |
|---|---|---|---|
| **Haiku 4.5** | 200K | $1 / $5 | Việc đơn lẻ, nhanh, rẻ. **Không đủ** cho vai trò đa nhiệm dài hơi. |
| **Sonnet 5** | 1M | $3 / $15 (giới thiệu $2 / $10 tới 31/08/2026) | Cân bằng tốt nhất chi phí/chất lượng. Code, UI/UX, test, research-first đều khá–tốt. |
| **Opus 4.8** | 1M | $5 / $25 | Chắc chắn hơn ở trade-off kiến trúc, rà lỗi logic tinh vi, phân tích tác động breaking change. |
| **Fable 5** | 1M (out 128K) | $10 / $50 | Mạnh nhất cho lý luận dài hơi, đề xuất chủ động sâu, quyết định kiến trúc nhiều đánh đổi. |

> Giá tham khảo tại thời điểm soạn file (cache 2026‑06); **xác minh lại giá/hiệu năng hiện hành** trước khi chốt ngân sách (nguyên tắc research-first, KHUNG‑3).

---

## 2. Đối chiếu năng lực với yêu cầu của khung

Khung CLAUDE.md đòi model đảm nhiệm nhiều vai cùng lúc. Bảng dưới cho biết mức đáp ứng:

| Yêu cầu của khung | Haiku 4.5 | Sonnet 5 | Opus 4.8 | Fable 5 |
|---|---|---|---|---|
| Code type-safe, validate input, xử lý lỗi (§3A) | 🟡 | ✅ | ✅ | ✅ |
| Research-first: xác minh phiên bản, chọn công nghệ (KHUNG‑3) | 🟡 | ✅ | ✅ | ✅✅ |
| Quản lý 9 giai đoạn + cổng + PROGRESS.md (§2) | 🟡 | ✅ | ✅ | ✅✅ |
| Chủ động góp ý, phát hiện rủi ro/phạm vi phình (§2) | 🟡 | ✅ | ✅✅ | ✅✅ |
| UI/UX, a11y WCAG AA, theme tokens (§3B) | 🟡 | ✅ | ✅ | ✅ |
| Rà lỗi logic tinh vi: async race, idempotency, tiền tệ (§3A‑6) | ❌ | 🟡 | ✅ | ✅✅ |
| Trade-off kiến trúc nhiều đánh đổi, mơ hồ cao (§9) | ❌ | 🟡 | ✅ | ✅✅ |
| Phân tích tác động breaking change / migration (§6) | ❌ | 🟡 | ✅ | ✅✅ |

**Đọc bảng:** ✅✅ xuất sắc · ✅ đủ tốt · 🟡 làm được nhưng có thể hụt nuance · ❌ không nên giao.

---

## 2b. Đánh giá chất lượng từng model theo từng khung/kỹ năng

Bảng dưới chấm mức phù hợp của mỗi model cho **từng tài liệu khung và từng kỹ năng** trong repo. Dùng để chọn model **đúng đầu việc**, không phải chọn một model cho cả dự án.

**Thang điểm:** ✅✅ xuất sắc, nên ưu tiên · ✅ đủ tốt, dùng thoải mái · 🟡 làm được nhưng nên soát kỹ / cân nhắc nâng cấp ở ca khó · ❌ không nên giao.

| Khung / Kỹ năng | Trọng tâm công việc | Haiku 4.5 | Sonnet 5 | Opus 4.8 | Fable 5 |
|---|---|:--:|:--:|:--:|:--:|
| **KHUNG‑1** — quy trình 9 giai đoạn + tiêu chuẩn | Kỷ luật giai đoạn, cổng, DoD, theo dõi trạng thái | 🟡 | ✅ | ✅✅ | ✅✅ |
| **KHUNG‑2** — luật AI + chống ảo giác + mẫu dự án | Tuân luật, không bịa API, đọc file thật | 🟡 | ✅ | ✅✅ | ✅✅ |
| **KHUNG‑3** — chọn công nghệ (research-first) + đề xuất chủ động | Xác minh phiên bản bằng nguồn sống, trade-off, đề xuất | ❌ | 🟡 | ✅ | ✅✅ |
| **`/tu-van`** — tư vấn phát triển (chuyên gia) | Bóc yêu cầu mơ hồ, đề xuất giải pháp, đánh đổi | 🟡 | ✅ | ✅✅ | ✅✅ |
| **`/khoi-tao`** — khởi tạo dự án mới | Dựng nền, cấu hình hàng rào, checklist triển khai | 🟡 | ✅ | ✅ | ✅ |
| **`/ui-ux`** — thiết kế UI/UX | Design tokens, mobile-first, WCAG AA Dark+Light, 4 trạng thái | 🟡 | ✅✅ | ✅✅ | ✅✅ |
| **`/cong`** — cổng commit/merge + báo cáo xác thực | Chạy build/lint/test, đọc diff, rà rác/bí mật | ✅ | ✅✅ | ✅✅ | ✅✅ |
| **`/adr`** — quyết định kiến trúc | So sánh phương án, ghi lý do, hệ quả dài hạn | ❌ | 🟡 | ✅✅ | ✅✅ |
| **`/audit-toi-uu`** — audit & tối ưu mã nguồn | Đo baseline, gỡ dead code, refactor không đổi hành vi | 🟡 | ✅ | ✅✅ | ✅✅ |
| **`/su-co`** — xử lý sự cố production | Giảm thiệt hại, chẩn đoán nhanh, post-mortem | ❌ | 🟡 | ✅✅ | ✅✅ |
| **BO-SUNG-chat-luong** — env/migration/DoR, hiệu năng/CWV, E2E+a11y, chống lỗi logic | Chi tiết chất lượng, ca biên, race/idempotency | 🟡 | 🟡 | ✅✅ | ✅✅ |
| **AP-DUNG (brownfield)** — áp khung lên dự án có sẵn | Đọc repo, suy ra stack thật, nâng cấp tăng dần | 🟡 | ✅ | ✅✅ | ✅✅ |

### Đọc bảng theo nhóm

- **Việc code/UI/cổng thường ngày** (KHUNG‑1 vận hành, `/ui-ux`, `/cong`, `/khoi-tao`): **Sonnet 5 là đủ tốt → xuất sắc**, chi phí thấp — dùng làm ngựa thồ.
- **Việc lý luận sâu / rủi ro cao** (KHUNG‑3 chọn công nghệ, `/adr`, `/su-co`, chống lỗi logic trong BO-SUNG, audit lớn): **Opus 4.8 xuất sắc; Sonnet 5 chỉ 🟡** → nên nâng Opus 4.8, hoặc Fable 5 ở ca khó nhất.
- **Việc đơn giản, đơn lẻ** (chạy cổng, chỉnh nhỏ): Haiku 4.5 gánh được phần cổng/kiểm tra máy móc; **không** giao phần lý luận (❌ ở KHUNG‑3, `/adr`, `/su-co`).
- **Fable 5** hầu như luôn ✅✅ nhưng **chênh lệch đáng giá tiền** chỉ ở nhóm lý luận sâu; ở việc thường ngày nó không hơn Sonnet 5/Opus 4.8 đủ để bù chi phí gấp 2–3 lần.

---

## 3. Các bước quyết định (chạy theo thứ tự)

### Bước 1 — Xác định quy mô & loại dự án
- Loại: web / mobile / backend‑API / desktop / CLI‑thư viện / data‑ML / game / blockchain / monorepo (xem KHUNG‑3 PHẦN A0).
- Quy mô ước lượng: số màn hình/endpoint, số dòng code dự kiến, số người dùng, thời gian chạy dự án.

### Bước 2 — Chấm 4 yếu tố rủi ro (mỗi ý “có” = +1)
1. **Dữ liệu/logic nhạy cảm?** (thanh toán, dữ liệu người dùng thật, quyền truy cập phức tạp)
2. **Kiến trúc nhiều đánh đổi?** (chọn giữa nhiều phương án lớn, khó đảo ngược)
3. **Migration schema phá vỡ / breaking change lan rộng?**
4. **Yêu cầu mơ hồ, nhiều cách hiểu, phạm vi dễ phình?**

### Bước 3 — Suy ra model mặc định
- **0–1 điểm** → **Sonnet 5** cho toàn dự án.
- **2 điểm** → **Sonnet 5** mặc định + **nâng Opus 4.8** ở đúng các mốc dính rủi ro.
- **3–4 điểm** → **Opus 4.8** mặc định + cân nhắc **Fable 5** cho quyết định kiến trúc khó nhất / GĐ 0–2.

### Bước 4 — Áp chiến lược lai (khuyến nghị cho tầm trung trở lên)
Dùng **model rẻ** cho ~80% việc thường ngày, **nâng model mạnh** đúng mốc:

| Giai đoạn / công việc | Model đề xuất |
|---|---|
| GĐ 0–2: ý tưởng, chọn công nghệ, thiết kế kiến trúc, viết ADR | **Opus 4.8** (hoặc Fable 5 nếu rất phức tạp) |
| GĐ 3–7: code tính năng, UI/UX, test, refactor, cập nhật docs | **Sonnet 5** |
| Cổng trước MERGE: rà bảo mật, migration, breaking change | **Opus 4.8** |
| GĐ 8: xử lý sự cố production, post-mortem | **Opus 4.8** |
| Audit/tối ưu mã nguồn (mốc lớn) | **Opus 4.8** |

### Bước 5 — Ghi quyết định
- Ghi model đã chọn + lý do vào **PROGRESS.md** (mục quyết định quan trọng) hoặc một **ADR** nếu coi đây là quyết định vận hành đáng lưu.
- Nêu rõ **quy tắc nâng cấp** (khi nào đổi sang model mạnh hơn) để nhất quán qua các phiên.

---

## 4. Ba kịch bản mẫu

**A. Dự án tầm trung, không nhạy cảm** (vd blog/CMS nội bộ, dashboard CRUD)
→ **Sonnet 5** xuyên suốt. Chỉ cân nhắc Opus 4.8 nếu về sau thêm thanh toán/migration lớn.

**B. Dự án tầm trung có 1–2 điểm nhạy cảm** (vd SaaS nhỏ có thanh toán)
→ **Sonnet 5** mặc định + **Opus 4.8** cho: thiết kế luồng thanh toán, migration schema, rà bảo mật trước merge, xử lý sự cố.

**C. Dự án lớn/phức tạp** (nhiều dịch vụ, realtime, dữ liệu nhạy cảm)
→ **Opus 4.8** mặc định + **Fable 5** cho các quyết định kiến trúc khó nhất (GĐ 0–2) và phân tích tác động breaking change diện rộng.

---

## 4b. Tự động hóa & tối ưu chi phí bằng cấu hình Claude Code

> Các mục dưới **đã xác minh từ tài liệu Claude Code chính thức** (`code.claude.com/docs`, xác minh **2026‑07‑01**). Cú pháp/tên biến có thể đổi theo phiên bản — xác minh lại khi áp dụng (research-first).

**Câu hỏi:** Claude có tự đổi model cho phù hợp không? — **Có, ở mức bán tự động.** Không có bộ định tuyến "theo độ khó từng câu", nhưng có **alias `opusplan`** tự đổi model theo **chế độ làm việc**, cộng với cơ chế giao việc rẻ cho subagent/tác vụ nền. Kết hợp lại đủ để tối ưu chi phí gần như tự động.

### 1) `opusplan` — hybrid tự động (đòn bẩy mạnh nhất)
Alias model đặc biệt: **dùng `opus` trong Plan Mode** (lý luận, thiết kế kiến trúc) → **tự chuyển sang `sonnet` khi thực thi** (sinh code). Khớp đúng chiến lược lai của khung mà **không cần đổi tay**.
- Đặt: `/model opusplan`, hoặc `ANTHROPIC_MODEL=opusplan`, hoặc `"model": "opusplan"` trong settings.
- Muốn ép ngữ cảnh 1M cả hai pha (khi tài khoản không tự nâng): `opusplan[1m]`.
- Nếu `availableModels` loại Opus → `opusplan` ở lại Sonnet cả trong Plan Mode.

### 2) Subagent chạy model rẻ (giao việc phụ tự động)
Tài liệu ghi rõ: *"Control costs by routing tasks to faster, cheaper models like Haiku."*
- Frontmatter subagent: trường **`model`** nhận `sonnet` · `opus` · `haiku` · `fable` · model ID đầy đủ (`claude-opus-4-8`) · hoặc `inherit` (mặc định).
  ```yaml
  ---
  name: code-explorer
  description: Tìm file, đọc code, tra cứu — việc phụ, cần rẻ
  tools: Read, Glob, Grep
  model: haiku
  ---
  ```
- Đặt **một model cho TẤT CẢ subagent**: biến `CLAUDE_CODE_SUBAGENT_MODEL` (ghi đè cả per-invocation lẫn frontmatter; `inherit` = dùng phân giải bình thường).
- Thứ tự phân giải model của subagent: `CLAUDE_CODE_SUBAGENT_MODEL` → tham số `model` mỗi lần gọi → `model` trong frontmatter → model của phiên chính.

### 3) Tác vụ nền dùng Haiku (tự động, rẻ)
Chức năng nền của Claude Code chạy bằng alias `haiku`; cấu hình qua `ANTHROPIC_DEFAULT_HAIKU_MODEL` (xem `code.claude.com/docs/en/costs` mục *background token usage*). Việc "vặt" không tiêu model đắt.

### 4) Chặn trần chi phí ở cấp dự án/tổ chức
- `availableModels` — giới hạn model được phép chọn (main + subagent + skill), vd `["sonnet", "haiku"]`.
- `enforceAvailableModels: true` — áp allowlist cho cả tùy chọn Default.
- `fallbackModel` — chuỗi model dự phòng khi model chính bận (tối đa 3), vd `["claude-sonnet-5", "claude-haiku-4-5"]`.

### 5) Đổi tay tại mốc (khi cần kiểm soát chính xác)
- `/model <alias|id>` đổi model phiên chính; `--model` khi khởi chạy; `ANTHROPIC_MODEL` cho một phiên; `"model"` trong settings để đặt cố định.
- Alias tiện: `default` (về model khuyến nghị của tài khoản), `opus[1m]` (Opus 1M cho phiên dài).

### Khuyến nghị cấu hình cho khung này

| Mục tiêu | Cấu hình |
|---|---|
| **Tối ưu tự động, ít can thiệp nhất** | `/model opusplan` — Opus khi thiết kế (GĐ 0–2/plan), Sonnet khi code |
| **Giao việc phụ cho model rẻ** | Subagent tra cứu/đọc file đặt `model: haiku` |
| **Trần chi phí toàn dự án** | `availableModels` + `fallbackModel` trong settings |
| **Ép Sonnet cho toàn subagent tạm thời** | `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` |

### ĐÃ KÍCH HOẠT trong repo này (phương án đóng gói cho cả nhóm)
Repo đã có sẵn cấu hình để tự tối ưu chi phí — ai mở repo bằng Claude Code đều nhận:
- **`.claude/settings.json`** → `"model": "opusplan"` (mặc định: Opus khi plan, **Sonnet 5 khi code**) + `"fallbackModel": ["claude-sonnet-5", "claude-haiku-4-5"]`.
- **`.claude/agents/tra-cuu.md`** → subagent `model: haiku`, **chỉ nhận việc Haiku 4.5 xuất sắc** (tìm file, grep symbol, định vị định nghĩa/tham chiếu, trích dữ kiện cụ thể — read-only). Không giao review/kiến trúc/sửa file cho subagent này.

> Muốn đổi mặc định về Sonnet 5 thuần (không dùng opusplan): sửa `"model"` trong `.claude/settings.json`. Muốn tắt subagent Haiku: xóa `.claude/agents/tra-cuu.md`. Cá nhân override tạm thời bằng `/model` mà không cần đổi file.

> **Lưu ý bản chất:** `opusplan` đổi model theo **chế độ (plan ⇄ execution)**, không phải "đoán độ khó từng câu". Việc phân tách main (đắt) ↔ subagent (rẻ) mới là cơ chế tự động thực sự. Kết hợp `opusplan` + subagent Haiku là cách "tự động tối ưu chi phí" sát nhất hiện có, không cần bạn đổi tay mỗi lần.

---

## 5. Cảnh báo & lưu ý

- **Đừng downgrade để tiết kiệm ở chỗ rủi ro cao.** Chi phí một quyết định kiến trúc/bảo mật sai lớn hơn nhiều lần tiền tiết kiệm model. Khung §9 liệt kê đúng những chỗ “dừng và hỏi” — đó cũng là chỗ nên dùng model mạnh.
- **Haiku 4.5 không dùng làm model chính** cho khung này — thiếu chiều sâu lý luận đa vai trò dài hơi. Chỉ hợp việc phụ, đơn lẻ, cần rẻ/nhanh.
- **Xác minh lại giá & hiệu năng** tại thời điểm bắt đầu dự án (research-first). Bảng giá trong file có thể lỗi thời.
- **Ngữ cảnh 1M** ở Sonnet 5 / Opus 4.8 / Fable 5 là đủ cho gần như mọi dự án theo khung; hiếm khi ngữ cảnh là yếu tố quyết định giữa ba model này — **chất lượng lý luận** mới là yếu tố chính.
- File này nói về model **chạy khung**; nếu bạn cần chọn model **cho tính năng AI bên trong sản phẩm**, đó là việc khác — dùng kỹ năng `claude-api`.

---

> **Kết luận cho dự án tầm trung:** **Sonnet 5 là điểm ngọt** — đủ năng lực cho gần như toàn bộ khung với chi phí thấp. **Nâng Opus 4.8 có chọn lọc** ở các mốc kiến trúc / bảo mật / migration để giảm rủi ro tối đa. Chỉ cần Fable 5 khi dự án chạm mức lớn/phức tạp thật sự.
