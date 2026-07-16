import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Đợt 10 — Tính năng B (Screener): trang /quet-tin-hieu quét tín hiệu kỹ thuật của mọi mã trong
 * registry ở một khung chọn được, kèm thẻ "Bối cảnh thị trường" (tỷ lệ Vàng/Bạc + tương quan
 * XAU/DXY). Xem docs/plans/xgold-analysis-surface-plan.md mục 3/6.
 */

test('render bảng đủ mã, đổi khung cập nhật', async ({ page }) => {
  await page.goto('/quet-tin-hieu');

  await expect(page.getByRole('heading', { level: 1, name: 'Quét tín hiệu' })).toBeVisible();

  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  // 4 mã trong registry (XAU/USD, XAG/USD, DXY, USD/VND) + 1 dòng tiêu đề.
  await expect(table.getByRole('row')).toHaveCount(5);
  await expect(table.getByRole('link', { name: 'XAU/USD' })).toBeVisible();
  await expect(table.getByRole('link', { name: 'XAG/USD' })).toBeVisible();

  // Mặc định khung 1D đang chọn.
  await expect(page.getByRole('button', { name: 'D', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: '1h' }).click();
  await expect(page.getByRole('button', { name: '1h' })).toHaveAttribute('aria-pressed', 'true');
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(5);
});

test('sắp xếp theo độ mạnh — bấm tiêu đề cột đảo chiều sort', async ({ page }) => {
  await page.goto('/quet-tin-hieu');

  const table = page.getByRole('table');
  await expect(table).toBeVisible();

  const sortButton = page.getByRole('button', { name: /Sắp xếp theo độ mạnh/ });
  await expect(sortButton).toHaveAccessibleName(/giảm dần/);

  await sortButton.click();
  await expect(sortButton).toHaveAccessibleName(/tăng dần/);
});

test('thẻ bối cảnh thị trường hiện tỷ lệ Vàng/Bạc + tương quan XAU/DXY', async ({ page }) => {
  await page.goto('/quet-tin-hieu');

  await expect(page.getByRole('heading', { name: 'Bối cảnh thị trường' })).toBeVisible();
  await expect(page.getByText('Tỷ lệ Vàng/Bạc (XAU/XAG)')).toBeVisible();
  await expect(page.getByText('Tương quan XAU ↔ DXY (30 phiên ngày)')).toBeVisible();
});

test('disclaimer tín hiệu kỹ thuật luôn hiển thị', async ({ page }) => {
  await page.goto('/quet-tin-hieu');
  await expect(page.getByText('không phải lời khuyên đầu tư')).toBeVisible();
});

test('điều hướng từ trang chủ tới trang quét tín hiệu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Quét tín hiệu' }).click();
  await expect(page).toHaveURL(/\/quet-tin-hieu$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Quét tín hiệu' })).toBeVisible();
});

test('trang quét tín hiệu không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/quet-tin-hieu');
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bối cảnh thị trường' })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
