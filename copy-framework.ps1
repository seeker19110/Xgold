#!/usr/bin/env pwsh
#
# copy-framework.ps1 — Mang bộ khung sang một DỰ ÁN KHÁC (kể cả dự án đã có sẵn).
#   → Bản PowerShell của copy-framework.sh, dùng cho Windows PowerShell / PowerShell 7+.
#     Hành vi giống hệt bản .sh (3 lớp: copy thẳng / copy nếu chưa có / đưa vào _framework-dropins).
#
# LƯU Ý MÃ HÓA: file này PHẢI được lưu dưới dạng UTF-8 CÓ BOM. Windows PowerShell 5.1 mặc định
#   đọc script theo ANSI; thiếu BOM sẽ làm hỏng ký tự tiếng Việt và gây lỗi parse
#   ("Missing closing '}'"). PowerShell 7 (pwsh) đọc UTF-8 không BOM vẫn được. Đừng lưu lại thành
#   "UTF-8 no BOM" khi chỉnh file này.
#
# Cách dùng:
#   1) Clone repo khung này về máy (hoặc bạn đang đứng sẵn trong nó).
#   2) Chạy (một trong hai):
#        pwsh ./copy-framework.ps1 C:\đường-dẫn\tới\dự-án-đích
#        powershell -ExecutionPolicy Bypass -File .\copy-framework.ps1 C:\đường-dẫn\tới\dự-án-đích
#   3) Mở phiên Claude Code TRONG dự án đích → AI tự đọc CLAUDE.md và tự dò stack.
#
# An toàn cho dự án đã có sẵn (brownfield):
#   - Tài liệu khung (docs/framework, mẫu ADR)  → copy thẳng (chỉ là tài liệu tham khảo mới).
#   - File gốc (CLAUDE.md, PROJECT.md...)        → chỉ copy nếu CHƯA có; nếu đã có thì để bản
#                                                  khung cạnh bên dưới đuôi .framework-new để bạn tự so.
#   - File cấu hình/stack (eslint, husky, app...) → KHÔNG đè; đưa vào _framework-dropins/ để bạn tự merge.
#
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string] $Target
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Ép console xuất UTF-8 để chữ tiếng Việt trong thông báo hiển thị đúng trên Windows PowerShell 5.1
# (mặc định in theo code page hệ thống). Bọc try/catch để không bao giờ làm script dừng.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$Src = $PSScriptRoot
$Sep = [System.IO.Path]::DirectorySeparatorChar

if ([string]::IsNullOrWhiteSpace($Target)) {
  Write-Host "Lỗi: thiếu đường dẫn dự án đích."
  Write-Host "Dùng:  pwsh ./copy-framework.ps1 /đường-dẫn/tới/dự-án-đích"
  exit 1
}
if (-not (Test-Path -LiteralPath $Target -PathType Container)) {
  Write-Host "Lỗi: '$Target' không phải thư mục."
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $Target '.git'))) {
  Write-Host "Cảnh báo: '$Target' không có .git — chắc đây là gốc repo dự án chứ?"
}

# ── Trợ giúp ──────────────────────────────────────────────
# Copy "src thành dest": thư mục → copy toàn bộ nội dung vào dest; file → copy file.
# Xác định theo dest, không tạo thư mục lồng thừa (khác cp -R vào dir có sẵn).
function Copy-Tree {
  param([string] $SrcFull, [string] $DestFull)
  if (Test-Path -LiteralPath $SrcFull -PathType Container) {
    New-Item -ItemType Directory -Force -Path $DestFull | Out-Null
    Get-ChildItem -LiteralPath $SrcFull -Force | ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination $DestFull -Recurse -Force
    }
  }
  else {
    $parent = Split-Path -Parent $DestFull
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    Copy-Item -LiteralPath $SrcFull -Destination $DestFull -Force
  }
}

function Resolve-Rel { param([string] $Rel) return $Rel.Replace('/', $Sep) }

function Copy-Into {            # copy thẳng (tạo thư mục cha)
  param([string] $Rel)
  $relN = Resolve-Rel $Rel
  $srcFull = Join-Path $Src $relN
  if (-not (Test-Path -LiteralPath $srcFull)) { return }
  Copy-Tree -SrcFull $srcFull -DestFull (Join-Path $Target $relN)
  Write-Host "  + $Rel"
}

function Copy-IfAbsent {        # chỉ copy nếu đích chưa có; nếu có thì để bản .framework-new
  param([string] $Rel)
  $relN = Resolve-Rel $Rel
  $srcFull = Join-Path $Src $relN
  if (-not (Test-Path -LiteralPath $srcFull)) { return }
  $destFull = Join-Path $Target $relN
  if (Test-Path -LiteralPath $destFull) {
    Copy-Tree -SrcFull $srcFull -DestFull ($destFull + '.framework-new')
    Write-Host "  ~ $Rel đã tồn tại → bản khung để ở $Rel.framework-new (tự so/merge)"
  }
  else {
    Copy-Tree -SrcFull $srcFull -DestFull $destFull
    Write-Host "  + $Rel"
  }
}

function Add-Dropin {           # đưa vào _framework-dropins/ (không đụng file đang chạy)
  param([string] $Rel)
  $relN = Resolve-Rel $Rel
  $srcFull = Join-Path $Src $relN
  if (-not (Test-Path -LiteralPath $srcFull)) { return }
  Copy-Tree -SrcFull $srcFull -DestFull (Join-Path (Join-Path $Target '_framework-dropins') $relN)
  Write-Host "  → _framework-dropins/$Rel"
}

Write-Host ""
Write-Host "Nguồn:  $Src"
Write-Host "Đích:   $Target"
Write-Host ""

# ── LỚP 1 — Quy trình & tiêu chuẩn (áp mọi stack): copy thẳng ──
Write-Host "[1/3] Tài liệu khung (Lớp 1 — dùng được ngay, mọi stack):"
Copy-Into "docs/framework"
Copy-Into "docs/ops"
Copy-Into ".claude/commands"                   # slash commands của khung: /audit-toi-uu /tu-van /cong /su-co /adr /khoi-tao
Copy-IfAbsent "docs/adr/0000-template.md"

# ── File gốc dự án: chỉ copy nếu chưa có ──
Copy-IfAbsent "CLAUDE.md"
Copy-IfAbsent "PROJECT.md"
Copy-IfAbsent "PROGRESS.md"
Copy-IfAbsent "CHANGELOG.md"
Copy-IfAbsent "CONTRIBUTING.md"
Copy-IfAbsent "SECURITY.md"
Copy-IfAbsent ".editorconfig"
Copy-IfAbsent ".nvmrc"
Copy-IfAbsent ".env.example"
# LICENSE KHÔNG copy: mỗi dự án tự chọn giấy phép + chủ sở hữu riêng.

# ── Cấu hình Claude Code: copy thẳng ──
Write-Host ""
Write-Host "[2/3] Cấu hình Claude Code (opusplan — tối ưu token: Opus lập kế hoạch, Sonnet code, Haiku phụ):"
$claudeDir = Join-Path $Target '.claude'
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
Copy-Tree -SrcFull (Join-Path $Src '.claude/settings-shared-opusplan.json') -DestFull (Join-Path $claudeDir 'settings.json')
Copy-Tree -SrcFull (Join-Path $Src '.claude/hooks') -DestFull (Join-Path $claudeDir 'hooks')
Copy-Tree -SrcFull (Join-Path $Src '.claude/agents') -DestFull (Join-Path $claudeDir 'agents')
Write-Host "  → .claude/settings.json (opusplan; fallback Sonnet 5 → Haiku 4.5)"
Write-Host "  → .claude/hooks"
Write-Host "  → .claude/agents (subagent Haiku: tra-cuu, kiem-tra-phien-ban)"

Write-Host ""
Write-Host "[3/3] File cấu hình khác (Lớp 2 — KHÔNG đè; để bạn tự merge cái khớp stack):"
$dropins = @(
  'eslint.config.mjs', 'postcss.config.mjs',
  '.prettierrc', '.prettierignore', '.lintstagedrc.json', 'commitlint.config.cjs',
  'vitest.config.ts', 'vitest.setup.ts', 'playwright.config.ts', 'lighthouserc.json',
  '.husky/pre-commit', '.husky/commit-msg',
  '.github/workflows/ci.yml', '.github/workflows/lighthouse-ci.yml',
  '.github/workflows/codeql.yml', '.github/workflows/secret-scan.yml', '.github/workflows/release.yml',
  '.github/pull_request_template.md', '.github/dependabot.yml', '.github/ISSUE_TEMPLATE', '.github/CODEOWNERS',
  'lib/env.ts', 'styles/theme.css', 'components/theme-toggle.tsx', 'i18n/request.ts', 'messages', 'app',
  'supabase'
)
foreach ($f in $dropins) { Add-Dropin $f }

Write-Host ""
Write-Host "[4/4] Xong. Tiếp theo trong dự án đích:"
Write-Host @'

  1) Cấu hình Claude Code đã sẵn sàng: .claude/settings.json dùng opusplan (tối ưu token).
     → Opus lập kế hoạch, Sonnet code, Haiku (subagent) việc phụ — chỉ trả giá Opus khi thực sự cần.
     ✅ Dự án nhỏ muốn rẻ hơn nữa: đổi "model" thành "claude-sonnet-5".
     ✅ Dự án rất phức tạp: nâng riêng lúc cần bằng /model claude-opus-4-8 (hoặc claude-fable-5).

  2) Mở phiên Claude Code NGAY TRONG dự án đích.
     → AI tự đọc CLAUDE.md + .claude/settings.json (opusplan sẵn sàng).
     → Chạy Bước 0 của docs/framework/AP-DUNG-vao-du-an-co-san.md
       (tự dò stack bằng cách đọc package.json/config — không cần bạn khai stack).

  3) Soát thư mục _framework-dropins/ : merge file cấu hình KHỚP stack vào dự án
     (các file lớp 2 khác: eslint, prettier, playwright, github workflows, etc.).
     Xong thì có thể xóa _framework-dropins/.

  4) Commit, rồi áp khung tăng dần theo AP-DUNG-vao-du-an-co-san.md
     (Prettier → ESLint → TS strict → hook → CI → lấp lỗ hổng test/a11y/hiệu năng).

  (Tùy chọn) Muốn luật áp cho MỌI dự án trên máy: chép CLAUDE.md vào ~/.claude/CLAUDE.md.
'@
Write-Host ""
