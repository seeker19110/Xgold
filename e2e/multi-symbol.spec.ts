import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Đợt 9 — Đa symbol: chart tổng quát hoá thành nhiều mã (route động /chart/[symbol]). Kiểm mã thứ hai
 * XAG/USD (bạc) render đúng, thanh chuyển mã điều hướng được, mã lạ trả 404, a11y sạch.
 */

test('trang /chart/xagusd (bạc) hiển thị tiêu đề, banner mẫu và chart nến', async ({ page }) => {
  await page.goto('/chart/xagusd');

  await expect(page.getByRole('heading', { level: 1, name: 'XAG/USD' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'dữ liệu mẫu' })).toBeVisible();

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá bạc XAG/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('thanh chuyển mã điều hướng XAU/USD → XAG/USD (URL + tiêu đề đổi)', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { level: 1, name: 'XAU/USD' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Chọn mã' });
  // Mã đang xem được đánh dấu aria-current="page".
  await expect(nav.getByRole('link', { name: 'XAU/USD' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'XAG/USD' }).click();

  // Cấu hình chỉ báo tự đồng bộ vào URL (?cfg=...) sau hydrate — chấp nhận query đi kèm.
  await expect(page).toHaveURL(/\/chart\/xagusd(\?.*)?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'XAG/USD' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'XAG/USD' })).toHaveAttribute('aria-current', 'page');
});

test('mã không hỗ trợ (/chart/khong-ton-tai) trả 404', async ({ page }) => {
  const res = await page.goto('/chart/khong-ton-tai');
  expect(res?.status()).toBe(404);
});

test('trang chart bạc không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xagusd');
  await expect(
    page.getByRole('group', { name: 'Chart nến giá bạc XAG/USD' }).locator('canvas').first(),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
