# Prompt khởi động: Audit tối ưu mã nguồn (áp lên dự án khác)

> Dùng khi muốn chạy **audit tối ưu mã nguồn** lên một dự án (thường là **dự án có sẵn / brownfield**)
> bằng một **phiên Claude Code mới mở trên repo đích**. Một phiên chỉ có quyền trên đúng repo nguồn
> của nó → không thao tác cross-repo được; muốn audit dự án khác thì **mở phiên mới trên chính repo đó**.
> Prompt dưới đây viết **độc lập** — chạy được dù repo đích đã có hay chưa có bộ khung này.
> Bám đúng playbook **`quality-supplements.md` Nhóm 2 mục 9** + **`existing-project-adoption.md` Bước 2–3**
> + nguyên tắc bất biến **`CLAUDE.md` §3 mục 10**.

## Khi nào dùng
- Có một dự án cần rà & tối ưu: gỡ dead code, giảm trùng lặp/độ phức tạp, tỉa dependency thừa, thu nhỏ bundle.
- Đặc biệt hợp với dự án đã chạy lâu, tích nhiều "nợ kỹ thuật".

## Chuẩn bị
1. Mở **phiên Claude Code mới** với **repo cần audit làm nguồn**.
2. Chọn **network policy** cho phép outbound (để cài tạm `knip`/`depcheck`… qua `npx`).
3. (Tùy chọn) Mang khung sang repo đích trước, từ repo template:
   ```bash
   bash copy-framework.sh /đường-dẫn/tới/repo-đích
   # rồi commit các file khung vào một nhánh của repo đích và push
   ```
   Không bắt buộc — prompt bên dưới vẫn chạy được dù repo đích chưa có khung.

## Prompt (dán nguyên văn vào phiên mới)

```text
Hãy AUDIT TỐI ƯU MÃ NGUỒN dự án này theo lối brownfield (dự án có sẵn).
Nguyên tắc bất biến: KHÔNG đổi hành vi · mỗi thay đổi có test bảo vệ · đi PR riêng ·
ưu tiên giá trị cao / rủi ro thấp · không tối ưu non (chỗ chưa chứng minh là điểm nghẽn).

GIAI ĐOẠN 1 — ĐO BASELINE (chỉ đọc & đo, KHÔNG sửa gì):
1) Tự dò stack: đọc package.json + lockfile + config (next/vite/tsconfig…) + cấu trúc
   thư mục. Báo cáo stack, phiên bản, lệnh build/test/lint thật.
2) Chạy đo (dùng npx, KHÔNG thêm vào dependencies):
   - Dead code + export/dep thừa:  npx knip
   - Dependency thừa:              npx depcheck
   - Trùng lặp (copy-paste):       npx jscpd .
   - Độ phức tạp:                  npx eslint . --rule '{"complexity":["warn",12]}'
   - Bundle (nếu là web):          @next/bundle-analyzer hoặc npx vite-bundle-visualizer
3) Tổng hợp BÁO CÁO AUDIT thành bảng theo 4 nhóm
   (dead code · trùng lặp/độ phức tạp · dependency · bundle). Mỗi mục ghi:
   vị trí (file:dòng) · mức độ · đề xuất xử lý · rủi ro · đã có test che chưa.
   Xếp theo ưu tiên. RỒI DỪNG LẠI, chờ tôi duyệt — chưa được sửa.

GIAI ĐOẠN 2 — HẠ DẦN (chỉ sau khi tôi duyệt):
- Làm từng PR nhỏ theo thứ tự ưu tiên. Mỗi PR:
  (a) đảm bảo có test che vùng sắp sửa TRƯỚC (chưa có thì viết characterization test);
  (b) refactor không đổi hành vi;
  (c) chạy TOÀN BỘ test xanh + build OK;
  (d) đo lại số liệu trước–sau (số dòng/dep/bundle/cảnh báo complexity);
  (e) commit conventional (refactor:/chore:), PR riêng tách khỏi feature.
- Không gom thứ chỉ "trông" giống nhau (tránh trừu tượng hóa sai).
- Ghi mọi "làm tạm" vào PROGRESS.md (nợ kỹ thuật).

Bắt đầu GIAI ĐOẠN 1 và đưa tôi báo cáo audit trước khi đụng vào code.
```

## Sau khi có báo cáo audit
- **Duyệt thứ tự ưu tiên** trước khi cho sửa — giá trị cao / rủi ro thấp làm trước.
- Có thể mang báo cáo về phiên/khung gốc để **review & phản biện kế hoạch** (việc này không cần quyền truy cập repo đích).
- Mỗi đợt tối ưu đi qua đúng cổng commit/merge của khung (`CLAUDE.md` §5–§7).
