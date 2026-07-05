import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Backlog sau Đợt 9 — thêm 2 mã DXY (chỉ số đô la Mỹ) và USD/VND (tỷ giá) vào registry, dùng chung
 * hạ tầng đa symbol (route động /chart/[symbol]) đã có từ Đợt 9. Kiểm cả 2 mã render đúng, thanh
 * chuyển mã liệt kê đủ 4 mã, a11y sạch.
 */

test('trang /chart/dxy hiển thị tiêu đề, banner mẫu và chart nến', async ({ page }) => {
  await page.goto('/chart/dxy');

  await expect(page.getByRole('heading', { level: 1, name: 'DXY' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'dữ liệu mẫu' })).toBeVisible();

  const chartContainer = page.getByRole('group', { name: 'Chart nến chỉ số đô la Mỹ DXY' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('trang /chart/usdvnd hiển thị tiêu đề, banner mẫu và chart nến', async ({ page }) => {
  await page.goto('/chart/usdvnd');

  await expect(page.getByRole('heading', { level: 1, name: 'USD/VND' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'dữ liệu mẫu' })).toBeVisible();

  const chartContainer = page.getByRole('group', { name: 'Chart nến tỷ giá USD/VND' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('thanh chuyển mã liệt kê đủ 4 mã (XAU/USD, XAG/USD, DXY, USD/VND)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const nav = page.getByRole('navigation', { name: 'Chọn mã' });
  await expect(nav.getByRole('link', { name: 'XAU/USD' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'XAG/USD' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'DXY' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'USD/VND' })).toBeVisible();

  await nav.getByRole('link', { name: 'DXY' }).click();
  await expect(page).toHaveURL(/\/chart\/dxy(\?.*)?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'DXY' })).toBeVisible();
});

test('trang chart DXY và USD/VND không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/dxy');
  await expect(
    page.getByRole('group', { name: 'Chart nến chỉ số đô la Mỹ DXY' }).locator('canvas').first(),
  ).toBeVisible();
  const dxyResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(dxyResults.violations).toEqual([]);

  await page.goto('/chart/usdvnd');
  await expect(
    page.getByRole('group', { name: 'Chart nến tỷ giá USD/VND' }).locator('canvas').first(),
  ).toBeVisible();
  const usdvndResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(usdvndResults.violations).toEqual([]);
});
