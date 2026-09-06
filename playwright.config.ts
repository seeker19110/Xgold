import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình E2E (Playwright).
 * Hai project: desktop (Chromium) + mobile (Pixel 5) → mọi luồng chính được kiểm
 * trên cả hai kích thước, ép tinh thần mobile-first.
 * Xem docs/framework/quality-supplements.md (Nhóm 2 mục 4).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // CI không cho lọt test.only
  retries: process.env.CI ? 2 : 0,
  // Playwright mặc định 1 worker trên CI. Runner ubuntu-latest có 4 nhân và hai project
  // (desktop + mobile) hoàn toàn độc lập, nên 4 worker chia đều tải; đo trước khi đổi: bước E2E
  // 80 s trong tổng 150 s của job (2026-09-06). Máy dev để undefined = Playwright tự chọn.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry', // có dấu vết để gỡ lỗi khi test chập chờn
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  // Tự dựng app trước khi chạy test (bỏ nếu bạn tự chạy server riêng).
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
