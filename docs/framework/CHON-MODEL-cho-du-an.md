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

## 5. Cảnh báo & lưu ý

- **Đừng downgrade để tiết kiệm ở chỗ rủi ro cao.** Chi phí một quyết định kiến trúc/bảo mật sai lớn hơn nhiều lần tiền tiết kiệm model. Khung §9 liệt kê đúng những chỗ “dừng và hỏi” — đó cũng là chỗ nên dùng model mạnh.
- **Haiku 4.5 không dùng làm model chính** cho khung này — thiếu chiều sâu lý luận đa vai trò dài hơi. Chỉ hợp việc phụ, đơn lẻ, cần rẻ/nhanh.
- **Xác minh lại giá & hiệu năng** tại thời điểm bắt đầu dự án (research-first). Bảng giá trong file có thể lỗi thời.
- **Ngữ cảnh 1M** ở Sonnet 5 / Opus 4.8 / Fable 5 là đủ cho gần như mọi dự án theo khung; hiếm khi ngữ cảnh là yếu tố quyết định giữa ba model này — **chất lượng lý luận** mới là yếu tố chính.
- File này nói về model **chạy khung**; nếu bạn cần chọn model **cho tính năng AI bên trong sản phẩm**, đó là việc khác — dùng kỹ năng `claude-api`.

---

> **Kết luận cho dự án tầm trung:** **Sonnet 5 là điểm ngọt** — đủ năng lực cho gần như toàn bộ khung với chi phí thấp. **Nâng Opus 4.8 có chọn lọc** ở các mốc kiến trúc / bảo mật / migration để giảm rủi ro tối đa. Chỉ cần Fable 5 khi dự án chạm mức lớn/phức tạp thật sự.
