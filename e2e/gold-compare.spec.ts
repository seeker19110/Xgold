import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Backlog "so sánh SJC vs thế giới quy đổi" (docs/plans/xgold-development-plan.md mục 2): quy đổi
 * XAU/USD + USD/VND sang VND/lượng, so với giá vàng trong nước mẫu. Xem lib/gold-compare/convert.ts.
 */

test('mở trang thấy tiêu đề, bảng so sánh và mốc thời gian giá thế giới', async ({ page }) => {
  await page.goto('/so-sanh-gia-vang');

  await expect(
    page.getByRole('heading', { level: 1, name: 'So sánh giá vàng trong nước & thế giới' }),
  ).toBeVisible();

  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(4); // 1 header + 3 sản phẩm mẫu

  await expect(page.getByText(/tính đến:/)).toBeVisible();
});

test('mỗi dòng có chênh lệch % giữa giá trong nước và giá thế giới quy đổi', async ({ page }) => {
  await page.goto('/so-sanh-gia-vang');

  const rows = page.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(4);

  const bodyRows = await rows.all();
  for (const row of bodyRows.slice(1)) {
    const cells = await row.getByRole('cell').allTextContents();
    expect(cells[3]).toMatch(/%/);
  }
});

test('trang so sánh giá không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/so-sanh-gia-vang');
  await expect(page.getByRole('table')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('link "So sánh giá trong nước & thế giới" từ trang chủ điều hướng đúng', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'So sánh giá trong nước & thế giới' }).click();
  await expect(page).toHaveURL(/\/so-sanh-gia-vang$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'So sánh giá vàng trong nước & thế giới' }),
  ).toBeVisible();
});
