# Gợi ý nâng cấp — rà soát 2026-10-13

> Lấy từ đợt rà soát chéo 19 repo của chủ sở hữu (ma trận vệ sinh ở [seeker19110/stored, mục 23 §8.1](https://github.com/seeker19110/stored/blob/main/23-own-repos-lessons/README.md); gợi ý tích hợp ở §7b của cùng file). Số liệu đo bằng lệnh trên HEAD (đếm `uses:` ghim SHA 40 ký tự, khối `permissions:`, `dependabot.yml`, `.claude/settings.json`), không suy ra từ văn xuôi. Đây là **đề xuất**, chưa sửa code. Mỗi mục kèm bằng chứng để kiểm lại trước khi làm; mục nào đã xử lý thì đánh dấu hoặc xoá.

## Hiện trạng đo được

| HEAD đọc | Action ghim SHA | Workflow thiếu `permissions:` cấp đầu | Dependabot | LICENSE · SECURITY | File test |
|---|---|---|---|---|---|
| `4fdb6f5` (2026-09-06) | 0/19 | `ci.yml`, `codeql.yml`, `lighthouse-ci.yml` | npm | có · có | 78 |

## Đề xuất (🔴 cao · 🟠 trung bình · 🟢 nhẹ)

| # | Mức | Đề xuất | Bằng chứng | Kiểm xong khi |
|---|---|---|---|---|
| 1 | 🟠 | Đồng bộ lại khung (`copy-framework.sh` của projects-template): repo đã đứng yên từ 6/9 và bỏ lỡ ADR-0007…0012 | HEAD `4fdb6f5` ngày 6/9; `.claude/hooks/` không có `auto-complete-guard.sh`; `settings.json` còn `"model": "opusplan"` | Không còn `opusplan`; Stop có guard |
| 2 | 🟠 | Ghim **19** action theo SHA và thêm ecosystem `github-actions` vào Dependabot (hiện chỉ có npm) | Ghim 0/19 | Lệnh grep `uses:` không ghim trả về 0 |
| 3 | 🟢 | Thêm `permissions: contents: read` cấp đầu cho `ci.yml`, `codeql.yml` và `lighthouse-ci.yml` | Ba workflow này không khai `permissions:`, nên dùng quyền mặc định của repo | `grep -L "^permissions:" .github/workflows/*.yml` rỗng |

## Giữ nguyên (điểm mạnh)

- Playwright CI 4 worker + cache, Lighthouse CI, 15 ADR, CodeQL và secret-scan.

## Gợi ý tích hợp từ catalog `stored`

- dependency-cruiser làm cổng kiến trúc, cùng CodeFlow để xem kiến trúc (stored mục 16 §2c).

## Ghi chú chung

- Ghim action theo SHA bằng [pinact](https://github.com/suzuki-shunsuke/pinact) hoặc [ratchet](https://github.com/sethvargo/ratchet), giữ comment tag (`# v7.0.1`), rồi để Dependabot `github-actions` tự nâng SHA. Đây là cách projects-template, xboss và Sales-Hunter đang làm.
- Chuẩn tham chiếu là `seeker19110/projects-template`: 25/25 action ghim SHA, mọi workflow có `permissions:` cấp đầu, Dependabot cho npm, github-actions và pip.
