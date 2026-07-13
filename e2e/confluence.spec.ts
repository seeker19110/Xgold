import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Đợt 10 — Tính năng A (MTF confluence): panel hợp lưu tín hiệu đa khung (1h/4h/1D/1W) trên trang
 * chart của một mã. Xem docs/plans/xgold-analysis-surface-plan.md mục 2/6.
 */

test('panel hợp lưu hiện đủ 4 khung + dòng tổng hợp trên /chart/xauusd', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const heading = page.getByRole('heading', { name: /Hợp lưu tín hiệu đa khung/ });
  await expect(heading).toBeVisible();

  const region = page.getByRole('region', { name: /Hợp lưu tín hiệu đa khung theo mã XAU\/USD/ });
  await expect(region).toBeVisible();

  const table = region.getByRole('table');
  await expect(table).toBeVisible();
  // 4 dòng khung (1h/4h/1D/1W) + 1 dòng tổng hợp + 1 dòng tiêu đề = 6.
  await expect(table.getByRole('row')).toHaveCount(6);
  await expect(table.getByText('1h')).toBeVisible();
  await expect(table.getByText('4h')).toBeVisible();
  await expect(table.getByText('1D')).toBeVisible();
  await expect(table.getByText('1W')).toBeVisible();
  await expect(table.getByText('Tổng hợp')).toBeVisible();
});

test('panel hợp lưu mang disclaimer bắt buộc', async ({ page }) => {
  await page.goto('/chart/xauusd');

  await expect(page.getByRole('heading', { name: /Hợp lưu tín hiệu đa khung/ })).toBeVisible();
  const disclaimers = page.getByText('không phải lời khuyên đầu tư');
  // Cả analysis-panel lẫn confluence-panel đều mang disclaimer dùng chung → xuất hiện ≥ 2 lần.
  await expect(disclaimers).toHaveCount(2);
});

test('panel hợp lưu không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { name: /Hợp lưu tín hiệu đa khung/ })).toBeVisible();
  await expect(
    page.getByRole('region', { name: /Hợp lưu tín hiệu đa khung theo mã XAU\/USD/ }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
