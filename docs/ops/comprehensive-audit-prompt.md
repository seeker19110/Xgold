# Prompt khởi động: Audit toàn diện dự án (mọi khía cạnh)

> Khác với **`/audit-optimize`** (chỉ tối ưu mã nguồn: dead code/trùng lặp/dependency/bundle),
> **`/audit-full`** rà **MỌI khía cạnh** của dự án: kiến trúc, bảo mật, chất lượng mã &
> xử lý lỗi logic, test/coverage, hiệu năng, accessibility/UI-UX, dependency & chuỗi cung ứng,
> CI/CD & vận hành, tài liệu có đồng bộ với code thật không, dữ liệu/migration, cấu hình & bí mật,
> **thống nhất chéo tính năng**. Áp dụng cho cả **dự án mới** (rà lại sau vài mốc) lẫn **dự án
> có sẵn/brownfield**. Muốn đi xa hơn audit — hoàn thiện dự án đến "không còn lỗi đã biết" theo
> kế hoạch chi tiết + vòng hội tụ → dùng `/completion` (`docs/framework/project-completion.md`),
> trong đó Pha 1 chính là audit này.
> Bám nguyên tắc bất biến `CLAUDE.md` §3–§4, hồ sơ/cổng theo loại dự án ở `KHUNG-3` PHẦN C,
> checklist chi tiết ở `quality-supplements.md` (Nhóm 1 + Nhóm 2) và `KHUNG-1` (tiêu chuẩn từng giai đoạn).

## Khi nào dùng
- Muốn có bức tranh đầy đủ về sức khỏe dự án, không chỉ mỗi tối ưu mã nguồn.
- Dự án chạy lâu, nhiều người từng đụng vào, không chắc còn khớp `PROJECT.md`/`CLAUDE.md` không.
- Trước một mốc lớn (ra mắt, gọi vốn, bàn giao) cần rà toàn diện có bằng chứng.
- Muốn **quét dần theo nhiều phiên** (dự án lớn, một phiên không quét hết) — có thể dừng giữa chừng
  và **tiếp tục đúng chỗ** ở phiên sau, thay vì phải quét lại từ đầu mỗi lần.

## Bước -1 — Xác nhận đây là DỰ ÁN CỤ THỂ, không phải khung/template còn trống

**Bắt buộc chạy trước cả Bước 0.** `/audit-full` audit một **dự án cụ thể đã phát triển**
(đã chọn tính năng + công nghệ, có code nghiệp vụ thật) — không audit được một bộ khung/template
còn trống, vì lúc đó chưa có gì để lập kế hoạch chi tiết (đúng nguyên tắc chống ảo giác,
`CLAUDE.md` §4: không bịa ra phát hiện cho tính năng chưa tồn tại).

Dấu hiệu **vẫn là khung/template trống** (chưa phải dự án cụ thể):
- `PROJECT.md` mục 1–8 (Vấn đề & người dùng, Phạm vi MVP, Tech stack, Thiết kế dữ liệu, API, DoD…)
  còn trống hoặc chỉ có placeholder mẫu, chưa mô tả một sản phẩm thật.
- `app/`/thư mục nguồn chỉ có file hệ thống mặc định của scaffold (vd `error.tsx`, `not-found.tsx`,
  `sitemap.ts`, `robots.ts`, `manifest.ts`, `sw.ts`) — **chưa có route/page/module nghiệp vụ nào**.
- ADR chọn stack (`docs/adr/0001-...`) vẫn ghi rõ là "stack tham chiếu mặc định" minh họa của
  khung, chưa phải quyết định cho một ý tưởng cụ thể của người dùng.
- `PROGRESS.md` không có giai đoạn phát triển tính năng nào (GĐ 0–2 của KHUNG-1) đã hoàn thành.

**Nếu rơi vào tình huống này:** DỪNG NGAY, không quét, không tạo báo cáo audit. Báo cho người
dùng đúng ý: *"Đây hiện là repo khung/template, chưa có dự án cụ thể để audit toàn diện. Audit
này cần tính năng + công nghệ đã chọn/triển khai thật thì mới lập được kế hoạch chi tiết — làm khi:
(a) mở phiên mới trên một dự án ĐÃ phát triển từ khung này (qua `copy-framework.sh`/`.ps1`), hoặc
(b) nếu đang phát triển ngay trong repo này, hoàn thành GĐ 0–2 của KHUNG-1 (ý tưởng → điền đủ
`PROJECT.md` → thiết kế) trước, rồi quay lại `/audit-full`."* Gợi ý chạy `/consult` hoặc
`/bootstrap` nếu người dùng muốn bắt đầu phát triển ngay.

**Nếu KHÔNG rơi vào tình huống trên** (đã có tính năng/code nghiệp vụ thật, dù còn thiếu/dở dang)
→ tiếp tục Bước 0 bên dưới như bình thường.

## Cơ chế quét lại / tiếp tục (bắt buộc đọc trước khi bắt đầu)

Trạng thái quét được lưu trong file **`docs/ops/COMPREHENSIVE-AUDIT-STATUS.md`** tại dự án đích
(không phải file này — file này chỉ là *hướng dẫn chạy*, dùng chung cho mọi dự án).

**Bước 0 — Kiểm tra trạng thái trước khi quét bất cứ gì:**
1. Đọc `docs/ops/COMPREHENSIVE-AUDIT-STATUS.md` nếu đã tồn tại.
2. **Chưa tồn tại** → đây là lần quét đầu. Tạo file mới từ mẫu ở PHẦN "Mẫu file trạng thái" bên dưới,
   liệt kê đủ 12 nhóm với trạng thái `⬜ Chưa quét`, rồi bắt đầu từ **Nhóm 1**.
3. **Đã tồn tại** → đọc bảng trạng thái, tóm tắt cho người dùng: nhóm nào `✅ Xong`, nhóm nào
   `🔄 Đang dở` (kèm đã quét tới đâu), nhóm nào `⬜ Chưa quét`. Rồi **hỏi người dùng** một trong hai:
   - **(a) Quét lại từ đầu:** reset toàn bộ về `⬜`, ghi đè ngày bắt đầu mới, quét lại từ Nhóm 1.
   - **(b) Tiếp tục:** chỉ quét các nhóm `⬜`/`🔄`, giữ nguyên kết quả các nhóm đã `✅`.
   Không tự ý chọn thay người dùng nếu cả (a)/(b) đều hợp lý — đây đúng dạng "yêu cầu mơ hồ" ở
   `CLAUDE.md` §9.

**Cập nhật trạng thái NGAY sau mỗi nhóm** (không đợi quét xong hết mới ghi) — để phiên sau (hoặc
nếu phiên này bị ngắt giữa chừng) biết chính xác điểm dừng:
- Quét xong trọn nhóm → đổi `✅ Xong`, ghi tóm tắt phát hiện (số lượng theo mức độ) + ngày.
- Đang quét dở (hết ngân sách/phiên) → để `🔄 Đang dở`, ghi rõ **đã xét sub-mục nào rồi** (vd
  "đã xong: input validation, authz; chưa xét: secrets scan, RLS") để lần sau vào đúng chỗ, không
  quét lại phần đã xong.

## Phạm vi áp dụng theo hồ sơ

Trước khi quét, đọc `PROJECT.md` mục 0 (loại dự án & hồ sơ) + tự dò `package.json`/config để biết
hồ sơ áp dụng (KHUNG-3 PHẦN C). Nhóm nào không áp dụng với hồ sơ này (vd Nhóm 6 Accessibility/UI
với dự án CLI thuần không UI) → đánh dấu `➖ Không áp dụng (lý do: ...)` thay vì quét, không bỏ sót
âm thầm.

## 12 nhóm audit — mỗi nhóm: vị trí · mức độ (Cao/Trung/Thấp) · đề xuất · rủi ro nếu để nguyên

### Nhóm 1 — Kiến trúc & thiết kế
Ranh giới module rõ chưa, coupling ngược hướng, phụ thuộc vòng, lớp truy cập dữ liệu có tách khỏi
UI/logic nghiệp vụ không, có "God file/class" không. Đối chiếu `KHUNG-1` GĐ 2 (thiết kế) + ADR đã
chốt (`docs/adr/`) — code hiện tại còn khớp quyết định trong ADR không.

### Nhóm 2 — Bảo mật
Theo `CLAUDE.md` §3 mục 2: không tin client, logic nhạy cảm ở server, truy vấn tham số hóa, escape
output, RLS/ACL bật & đã test. Chạy đo (qua `npx`, không thêm dependency):
- Lỗ hổng dependency: `npm audit` (hoặc `pnpm audit`/`yarn audit` tùy trình quản lý gói)
- Secrets lộ trong code/lịch sử: `npx trufflehog filesystem .` hoặc `npx gitleaks detect` (nếu có sẵn CI CodeQL/secret-scan thì đọc kết quả run gần nhất thay vì chạy lại)
- Input validation: rà endpoint/form có validate runtime (Zod hoặc tương đương) chưa.

### Nhóm 3 — Chất lượng mã & chống lỗi logic
Theo `CLAUDE.md` §3 mục 4/6 + `quality-supplements.md` Nhóm 2 mục 6 (chống lỗi logic): ca biên/rỗng,
`null` vs 0, async race/idempotency, thời gian UTC, tiền không dùng float. Đây **không trùng**
`/audit-optimize` (tối ưu mã nguồn: dead code/trùng lặp/dependency/bundle) — nhóm này xét **đúng-sai
nghiệp vụ**, không xét tối ưu. Nếu người dùng cũng cần khía cạnh tối ưu mã nguồn, gợi ý chạy thêm
`/audit-optimize` (không lặp lại công việc trong nhóm này).

### Nhóm 4 — Kiểm thử & coverage
`quality-supplements.md` Nhóm 2 mục 4: có unit + E2E (Playwright) chưa, ngưỡng coverage đạt chưa,
test có che ca biên (Nhóm 3 ở trên) không, test có flaky không (rà log CI gần nhất).

### Nhóm 5 — Hiệu năng (theo hồ sơ, KHUNG-3 PHẦN C)
Hồ sơ Web: Core Web Vitals (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) qua Lighthouse CI, bundle size.
Hồ sơ Backend/API: p95 latency, N+1 query, index thiếu. Hồ sơ CLI/lib: thời gian chạy, kích thước
gói. Không áp cổng web cho hồ sơ không phải web.

### Nhóm 6 — Accessibility & UI/UX (chỉ hồ sơ có UI)
WCAG AA (tương phản, bàn phím, nhãn input, alt ảnh), `jsx-a11y` + axe, mobile-first (vùng chạm
≥ 44px), theme Dark blue + Light dùng design tokens không hard-code màu (`CLAUDE.md` §3 mục 8–10).

### Nhóm 7 — Dependency & chuỗi cung ứng
`npm outdated`, `npm audit`, giấy phép (license) các gói chính có xung đột với giấy phép dự án
không, gói không còn maintain (rà ngày publish gần nhất).

### Nhóm 8 — CI/CD & vận hành/observability
Pipeline CI có build+type+lint+test+security scan chưa, branch protection, có theo dõi lỗi
(Sentry) + log tập trung chưa, quy trình xử lý sự cố (`docs/ops/incident-response.md`) có thật hay
chỉ là tài liệu chưa từng dùng.

### Nhóm 9 — Tài liệu & đồng bộ với code thật
`PROJECT.md`/`CLAUDE.md` §10 còn `[ĐIỀN]` bỏ trống không, mục 4 (tech stack) còn khớp
`package.json` thật không, `PROGRESS.md` có phản ánh đúng tiến độ thật không, ADR có quyết định
nào đã lỗi thời (code đổi nhưng ADR không cập nhật — nhắc: không sửa ADR cũ, mà viết ADR mới nếu
đổi quyết định).

### Nhóm 10 — Dữ liệu & migration
Migration có đánh version, có rollback được không, backup có test restore thử chưa, schema trong
code (types/model) có khớp schema CSDL thật không.

### Nhóm 11 — Cấu hình môi trường & bí mật
`.env.example` có đủ biến so với `.env` thật dùng không (không lộ giá trị thật), không commit
`.env`, biến bắt buộc có validate lúc khởi động (`lib/env.ts` hoặc tương đương) chưa.

### Nhóm 12 — Thống nhất chéo tính năng (cross-feature consistency)
> Nhóm này cần **Bản đồ tính năng** (`docs/FEATURE-MAP.md`) làm căn cứ rà chéo — nếu chưa có, lập
> trước theo `project-completion.md` Pha 0 (đọc code thật: route, menu, controller, command —
> không đoán).

Rà các tính năng **cùng loại** xem có làm **cùng một kiểu** không — đây là nguồn lỗi logic lớn nhất
ở dự án có sẵn (sửa chỗ này quên chỗ kia):
- **Logic trùng lặp đã phân kỳ:** cùng một nghiệp vụ cài ở ≥ 2 nơi và đã lệch nhau (vd 2 chỗ tính
  giá, 2 chỗ kiểm tra hạn mức) → đề xuất hợp nhất về **một nguồn sự thật**.
- **Validation:** mọi form/endpoint dùng cùng một cơ chế validate + cùng quy ước thông báo lỗi.
- **API:** response shape thống nhất (cấu trúc lỗi, mã lỗi, phân trang, đặt tên trường).
- **Phân quyền:** mọi thao tác nhạy cảm check quyền **cùng một lớp, cùng một cách** (không chỗ ở
  middleware, chỗ ở component, chỗ quên hẳn).
- **Trạng thái UI:** loading/empty/error/success đủ và cùng pattern ở mọi màn hình (hồ sơ có UI).
- **Quy ước:** đặt tên, cấu trúc thư mục, i18n (khóa thiếu một ngôn ngữ), theme (màu hard-code
  lệch tokens) — so tính năng mới nhất với cũ nhất để thấy "trôi chuẩn".
- Đối chiếu **Sổ quy ước** (`docs/CONVENTIONS.md`) nếu có: chỗ lệch sổ → phát hiện; pattern chưa
  có trong sổ → đề xuất bổ sung sổ.

## Quy trình chạy (2 giai đoạn, giống `/audit-optimize`)

**GIAI ĐOẠN 1 — QUÉT (đọc & đo, KHÔNG sửa gì):**
Thực hiện đúng "Cơ chế quét lại/tiếp tục" ở trên. Sau khi các nhóm áp dụng đều `✅`, tổng hợp
**BÁO CÁO AUDIT TOÀN DIỆN**: bảng theo 12 nhóm, mỗi phát hiện có **ID cố định (`F-001`, `F-002`…
— dùng truy vết về sau, nhất là khi vào `/completion`)** · vị trí (file:dòng) · mức độ ·
đề xuất · rủi ro nếu để nguyên · công sức ước tính. Xếp ưu tiên toàn cục (Cao trước). **RỒI DỪNG,
chờ người dùng duyệt** — chưa sửa gì.

**GIAI ĐOẠN 2 — XỬ LÝ (chỉ sau khi được duyệt):**
Làm từng PR nhỏ theo ưu tiên đã duyệt, mỗi PR qua đúng cổng `/gate` (`CLAUDE.md` §5–§7). Việc nào
là refactor không đổi hành vi → làm theo playbook `/audit-optimize`. Việc nào sửa lỗi thật (bug/lỗ
hổng) → có test tái hiện lỗi trước khi sửa. Sau mỗi mục xử lý xong: cập nhật
`docs/ops/COMPREHENSIVE-AUDIT-STATUS.md` (đánh dấu đã xử lý) + `PROGRESS.md` (nợ kỹ thuật đã trả,
nếu có).

## Mẫu file trạng thái (`docs/ops/COMPREHENSIVE-AUDIT-STATUS.md`)

```markdown
# Trạng thái Audit toàn diện

> AI đọc/ghi file này để biết quét tới đâu — cho phép tiếp tục qua nhiều phiên.
> Trạng thái mỗi nhóm: ⬜ Chưa quét · 🔄 Đang dở · ✅ Xong · ➖ Không áp dụng.

- Lần quét bắt đầu: <ngày>
- Hồ sơ dự án áp dụng (KHUNG-3 PHẦN C): <vd C1 Web app>

| # | Nhóm | Trạng thái | Tóm tắt phát hiện (số lượng theo mức độ) | Cập nhật lần cuối |
|---|------|-----------|-------------------------------------------|---------------------|
| 1 | Kiến trúc & thiết kế | ⬜ | | |
| 2 | Bảo mật | ⬜ | | |
| 3 | Chất lượng mã & chống lỗi logic | ⬜ | | |
| 4 | Kiểm thử & coverage | ⬜ | | |
| 5 | Hiệu năng | ⬜ | | |
| 6 | Accessibility & UI/UX | ⬜ | | |
| 7 | Dependency & chuỗi cung ứng | ⬜ | | |
| 8 | CI/CD & vận hành/observability | ⬜ | | |
| 9 | Tài liệu & đồng bộ | ⬜ | | |
| 10 | Dữ liệu & migration | ⬜ | | |
| 11 | Cấu hình môi trường & bí mật | ⬜ | | |
| 12 | Thống nhất chéo tính năng | ⬜ | | |

## Ghi chú điểm dừng (nhóm đang 🔄 dở — đã xét sub-mục nào, chưa xét sub-mục nào)
- (điền khi có nhóm đang dở)
```

## Sau khi có báo cáo audit toàn diện
- **Duyệt thứ tự ưu tiên** trước khi cho sửa — giá trị cao/rủi ro thấp làm trước, đúng `CLAUDE.md` §9 (dừng hỏi khi mơ hồ/rủi ro cao).
- Có thể mang báo cáo về phiên khác để phản biện kế hoạch (không cần quyền truy cập repo đích).
- Mỗi đợt xử lý đi qua đúng cổng commit/merge của khung (`/gate`).
