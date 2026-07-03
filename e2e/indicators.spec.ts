import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Luồng chính (PROJECT.md mục 7, bước 4-5): mở panel chỉ báo, thêm/xóa đường Multi-MA và
 * Multi-RSI, cấu hình giữ nguyên sau khi dán lại URL đã chia sẻ.
 */

test('mặc định có 3 đường Multi-MA và 1 đường Multi-RSI', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { name: 'Multi-MA' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Xóa đường/ })).toHaveCount(3);
  await expect(page.getByRole('button', { name: /^Xóa RSI/ })).toHaveCount(1);
});

test('thêm rồi xóa một đường MA cập nhật đúng số lượng', async ({ page }) => {
  await page.goto('/chart/xauusd');

  await page.getByRole('button', { name: '+ Thêm đường MA' }).click();
  await expect(page.getByRole('button', { name: /^Xóa đường/ })).toHaveCount(4);

  await page
    .getByRole('button', { name: /^Xóa đường/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: /^Xóa đường/ })).toHaveCount(3);
});

test('thêm một đường RSI cập nhật đúng số lượng', async ({ page }) => {
  await page.goto('/chart/xauusd');

  await page.getByRole('button', { name: '+ Thêm đường RSI' }).click();
  await expect(page.getByRole('button', { name: /^Xóa RSI/ })).toHaveCount(2);
});

test('cấu hình giữ nguyên khi dán lại URL đã chia sẻ (tab mới)', async ({ page, context }) => {
  await page.goto('/chart/xauusd');
  await page.getByRole('button', { name: '+ Thêm đường MA' }).click();
  await expect(page.getByRole('button', { name: /^Xóa đường/ })).toHaveCount(4);

  const sharedUrl = page.url();
  expect(sharedUrl).toContain('cfg=');

  const page2 = await context.newPage();
  await page2.goto(sharedUrl);
  await expect(page2.getByRole('button', { name: /^Xóa đường/ })).toHaveCount(4);
});

test('panel chỉ báo không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { name: 'Multi-MA' })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
