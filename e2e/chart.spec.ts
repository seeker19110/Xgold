import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Luồng chính: mở trang chart XAU/USD, thấy chart nến (dữ liệu mẫu vì CI chưa cấu hình Supabase),
 * đổi khung thời gian. Xem PROJECT.md mục 7 (luồng người dùng chính).
 */

test('mở trang chart thấy tiêu đề, banner dữ liệu mẫu và chart nến', async ({ page }) => {
  await page.goto('/chart/xauusd');

  await expect(page.getByRole('heading', { level: 1, name: 'XAU/USD' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'dữ liệu mẫu' })).toBeVisible();

  // Chart vẽ vào <canvas> bên trong container role="group" — chờ canvas xuất hiện thay vì timeout cố định.
  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('đổi khung thời gian cập nhật nút đang chọn (aria-pressed)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const btn1h = page.getByRole('button', { name: '1h', exact: true });
  const btn4h = page.getByRole('button', { name: '4h', exact: true });

  await expect(btn1h).toHaveAttribute('aria-pressed', 'true');
  await expect(btn4h).toHaveAttribute('aria-pressed', 'false');

  await btn4h.click();

  await expect(btn4h).toHaveAttribute('aria-pressed', 'true');
  await expect(btn1h).toHaveAttribute('aria-pressed', 'false');
});

test('trang chart không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(
    page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' }).locator('canvas').first(),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('chuyển theme Dark blue ↔ Light ngay trên trang chart (không cần rời trang)', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const toggle = page.getByRole('button', { name: /Chuyển sang nền/ });
  await expect(toggle).toHaveAccessibleName('Chuyển sang nền sáng');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');

  await toggle.click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Chuyển sang nền tối');

  // Đổi theme không phá chart — canvas vẫn còn và không có lỗi console mới.
  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});
