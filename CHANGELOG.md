# Changelog

Mọi thay đổi đáng kể của dự án được ghi ở đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/),
và dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

> Vì commit theo _conventional commits_, phần "Unreleased" có thể được sinh tự động sau
> (ví dụ `standard-version` / `changesets`). Trước mắt cập nhật tay khi có thay đổi đáng kể.

## [1.4.0](https://github.com/seeker19110/Xgold/compare/v1.3.0...v1.4.0) (2026-07-16)


### Features

* **chart:** dải khung thời gian đầy đủ kiểu TradingView 5m → 1M ([#25](https://github.com/seeker19110/Xgold/issues/25)) ([662a22c](https://github.com/seeker19110/Xgold/commit/662a22cd974b3a97dad422d8a6ac83835aad4b3c))
* **chart:** thanh khối lượng + legend OHLC kiểu TradingView ([#27](https://github.com/seeker19110/Xgold/issues/27)) ([060b353](https://github.com/seeker19110/Xgold/commit/060b3535deca521495bb2f570046163e17e4f731))

## [1.3.0](https://github.com/seeker19110/Xgold/compare/v1.2.0...v1.3.0) (2026-07-16)


### Features

* **ADR-0011:** Add Ichimoku cloud + RSI stack rules + trade levels ([29fd32e](https://github.com/seeker19110/Xgold/commit/29fd32e0b1a48319e76aa70bc5fcda776444786d))
* **chart:** đa symbol — thêm XAG/USD + registry mã + route động /chart/[symbol] (Đợt 9) ([#18](https://github.com/seeker19110/Xgold/issues/18)) ([fe8c3c2](https://github.com/seeker19110/Xgold/commit/fe8c3c2f36bafbd5687a5ff33e6b5ddecfa0f21b))
* **chart:** thêm mã DXY (chỉ số đô la Mỹ) và USD/VND vào registry ([#20](https://github.com/seeker19110/Xgold/issues/20)) ([d5ad378](https://github.com/seeker19110/Xgold/commit/d5ad378595dee7e561ab5b1ca8cb720d66c3b168))
* đợt 10 — bề mặt phân tích (MTF confluence + Screener + Ratio) ([#22](https://github.com/seeker19110/Xgold/issues/22)) ([24b2315](https://github.com/seeker19110/Xgold/commit/24b231530a2b778528e46fbe223f413989e04045))
* **gold-compare:** so sánh giá vàng trong nước với giá thế giới quy đổi ([#21](https://github.com/seeker19110/Xgold/issues/21)) ([c637839](https://github.com/seeker19110/Xgold/commit/c6378392c619e148b668638e31095ccad72cdc98))
* **orchestration:** áp dụng Kiến trúc điều phối 3 tầng ([#24](https://github.com/seeker19110/Xgold/issues/24)) ([0068fa8](https://github.com/seeker19110/Xgold/commit/0068fa8eab92c34c715f1d96e7f7036813569fa6))

## [1.2.0](https://github.com/seeker19110/Xgold/compare/v1.1.0...v1.2.0) (2026-07-04)


### Features

* **analysis:** kế hoạch sau MVP + indicator kết hợp phân tích và gợi ý mua/bán (Đợt 6–8) ([#16](https://github.com/seeker19110/Xgold/issues/16)) ([8ddd110](https://github.com/seeker19110/Xgold/commit/8ddd110b43660bbec13263963573799017843a68))

## [1.1.0](https://github.com/seeker19110/Xgold/compare/v1.0.1...v1.1.0) (2026-07-03)


### Features

* **domestic-gold:** thêm vang.today làm nguồn dự phòng khi BTMC lỗi ([#13](https://github.com/seeker19110/Xgold/issues/13)) ([96119f4](https://github.com/seeker19110/Xgold/commit/96119f4d791528fea2c67b55e5923311fff9a823))

## [1.0.1](https://github.com/seeker19110/Xgold/compare/v1.0.0...v1.0.1) (2026-07-03)


### Bug Fixes

* coerce numeric Supabase response + hoàn thiện Đợt 1 (/completion) ([#8](https://github.com/seeker19110/Xgold/issues/8)) ([a702b84](https://github.com/seeker19110/Xgold/commit/a702b8464351d28706f175d39e118d8fcf13f98b))
* Đợt 3 hoàn thiện — dọn dẹp nhỏ (F-005/F-006/F-007) ([#11](https://github.com/seeker19110/Xgold/issues/11)) ([96bf5e3](https://github.com/seeker19110/Xgold/commit/96bf5e3979556f00890d26249580f9dd8ff48e8a))

## 1.0.0 (2026-07-03)


### ⚠ BREAKING CHANGES

* /tu-van→/consult, /cong→/gate, /khoi-tao→/bootstrap, /tu-dong→/auto, /audit-toan-dien→/audit-full, /audit-toi-uu→/audit-optimize, /su-co→/incident; subagent tra-cuu→lookup, kiem-tra-phien-ban→version-check, thuc-thi→executor; tên file docs đổi theo bảng ánh xạ trong docs/framework/README.md.

### Features

* cấu hình opusplan dùng chung cho mọi dự án (tối ưu token) ([#19](https://github.com/seeker19110/Xgold/issues/19)) ([30608e6](https://github.com/seeker19110/Xgold/commit/30608e63288cc92773f6a1cf467b279830a3cdde))
* chế độ chạy tự động + hướng dẫn chọn model Claude cho khung ([534ca84](https://github.com/seeker19110/Xgold/commit/534ca849b58a3efc6816a5a2fb4f9bace2c94c06))
* copy-framework.ps1 (bản PowerShell cho Windows) + hướng dẫn "đã có repo khung này" ([#17](https://github.com/seeker19110/Xgold/issues/17)) ([fbff876](https://github.com/seeker19110/Xgold/commit/fbff8765e4782cb700f2c3fd5460d4c66e8bc65d))
* **domestic-gold:** thêm theo dõi giá vàng trong nước (Đợt 5) ([f76a5e6](https://github.com/seeker19110/Xgold/commit/f76a5e67a26f95fde8a18073a9ddb38cf875e68d))
* **framework:** copy-framework.sh — mang khung sang dự án khác ([d5d3ef6](https://github.com/seeker19110/Xgold/commit/d5d3ef6dce7174ceeaeba6deeab8a5713f13fbe9))
* **framework:** hoàn thiện hàng rào tự động + vận hành + vệ sinh repo ([9cc38f9](https://github.com/seeker19110/Xgold/commit/9cc38f9e2222ce1a4dcced85f5b21a708795c3c4))
* **framework:** hoàn thiện hàng rào tự động, vận hành & vệ sinh repo ([bb0665c](https://github.com/seeker19110/Xgold/commit/bb0665cbecfae575d8e1b8328e6b72e563c5b6ba))
* **framework:** slash command /audit-toi-uu + trigger để AI tự chạy audit tối ưu ([ac458a4](https://github.com/seeker19110/Xgold/commit/ac458a4a0abd16be5b66891e4efc325b85dea317))
* **framework:** slash command /audit-toi-uu + trigger để AI tự chạy audit tối ưu ([0623f43](https://github.com/seeker19110/Xgold/commit/0623f4379cc154e2ca5c1112659b605f0b921227))
* **framework:** thêm copy-framework.sh để mang khung sang dự án khác ([754c51d](https://github.com/seeker19110/Xgold/commit/754c51d114aaa1fc06088296191dd947176bf9d9))
* **framework:** thêm Nhóm 2 (mobile/perf/test/UI-UX/logic), KHUNG-3 chọn công nghệ research-first, theme Dark blue + Light ([b00d1a4](https://github.com/seeker19110/Xgold/commit/b00d1a4130c312b68fc482333fe7eac04aebbf60))
* nhắc nâng Fable 5/xhigh trong các skill lý luận sâu ([#20](https://github.com/seeker19110/Xgold/issues/20)) ([e9d01c2](https://github.com/seeker19110/Xgold/commit/e9d01c2d3b35380f24044c2d15f1c17b0b60f11c))
* **skill:** thêm bộ skill chuyên gia cho khung (tư vấn, cổng, sự cố, ADR, khởi tạo, UI/UX) ([#13](https://github.com/seeker19110/Xgold/issues/13)) ([0a582aa](https://github.com/seeker19110/Xgold/commit/0a582aa79b2608c0c5b6a20127118de3a76f1afc))
* subagent Sonnet `thuc-thi` + gộp doc model/tự động ([#21](https://github.com/seeker19110/Xgold/issues/21)) ([41624eb](https://github.com/seeker19110/Xgold/commit/41624eb5ee347e78856ad5168ffd7e178efa9f21))
* tái cấu trúc tên file sang tiếng Anh + quy trình hoàn thiện dự án (/completion) ([#24](https://github.com/seeker19110/Xgold/issues/24)) ([6c392b0](https://github.com/seeker19110/Xgold/commit/6c392b0fc4a7dc4970e7fb74b35052d471122375))
* **template:** hiện đại hóa toolchain (ESLint flat config, Tailwind 4, bỏ next lint) + thêm năng lực đa dụng (i18n, PWA, SEO, trang lỗi) ([24ce62a](https://github.com/seeker19110/Xgold/commit/24ce62a8f8b913594b2c2def8802f1ac8f8e454b))
* thêm tính năng audit toàn diện (/audit-toan-dien) ([#23](https://github.com/seeker19110/Xgold/issues/23)) ([1bb5cf7](https://github.com/seeker19110/Xgold/commit/1bb5cf736a2bfb5d88ac3d2f198dde10dc94a94c))
* xác nhận/cảnh báo model opusplan khi mở phiên template ([2e7e1ba](https://github.com/seeker19110/Xgold/commit/2e7e1baaf072b8a5747457fe8dfcae0e117b3919))
* Xgold MVP — chart giá vàng XAU/USD với Multi-MA + Multi-RSI ([#1](https://github.com/seeker19110/Xgold/issues/1)) ([588f1e9](https://github.com/seeker19110/Xgold/commit/588f1e9c4fc3ea2e06e1bda251a02aa62739d6d8))


### Bug Fixes

* **ci:** cấp quyền pull-requests:read cho gitleaks (sửa lỗi 403) ([366aeec](https://github.com/seeker19110/Xgold/commit/366aeecffe531c260680a03dd5db1982cfab1f87))
* **ci:** CodeQL theo guard package.json + sửa input languages ([8db7e46](https://github.com/seeker19110/Xgold/commit/8db7e46b289bd0fb2e577453cdaa2e5ed96a7578))
* loại CHANGELOG.md khỏi Prettier để job quality không đỏ oan ([#7](https://github.com/seeker19110/Xgold/issues/7)) ([539baef](https://github.com/seeker19110/Xgold/commit/539baeffb1cb5f5ceae4fcbe869f310223bd9952))
* lưu copy-framework.ps1 dạng UTF-8 có BOM để Windows PowerShell 5.1 parse đúng ([#18](https://github.com/seeker19110/Xgold/issues/18)) ([59a280f](https://github.com/seeker19110/Xgold/commit/59a280fbb238f20c1ed90ee9da7f1e9247fd751d))
* sửa lỗi copy-framework thiếu scripts/ + đồng bộ tài liệu sau tái cấu trúc ([#27](https://github.com/seeker19110/Xgold/issues/27)) ([6a4ac40](https://github.com/seeker19110/Xgold/commit/6a4ac405ef8247b17dd8f11b8dcbd65e5aee06e7))

## [Unreleased]

### Added (Thêm)

-

### Changed (Đổi)

-

### Fixed (Sửa)

-

### Removed (Bỏ)

-

<!--
Khi phát hành phiên bản, tạo mục mới phía trên, ví dụ:

## [0.1.0] - 2026-01-01
### Added
- Phiên bản đầu tiên.
-->
