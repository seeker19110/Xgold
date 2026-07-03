import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Luồng Đợt 5 (Should have): mở trang giá vàng trong nước, thấy bảng mua/bán + badge độ tươi dữ liệu
 * (dữ liệu mẫu vì CI chưa cấu hình Supabase). Xem PROJECT.md mục 2, ADR-0005.
 */

test('mở trang thấy tiêu đề, banner dữ liệu mẫu, bảng giá và badge độ tươi', async ({ page }) => {
  await page.goto('/gia-vang-trong-nuoc');

  await expect(page.getByRole('heading', { level: 1, name: 'Giá vàng trong nước' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'dữ liệu mẫu' })).toBeVisible();

  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(4); // 1 header + 3 sản phẩm mẫu

  await expect(page.getByRole('status').filter({ hasText: 'Cập nhật:' })).toBeVisible();
});

test('bảng giá hiển thị đúng mua vào <= bán ra cho từng sản phẩm', async ({ page }) => {
  await page.goto('/gia-vang-trong-nuoc');

  const rows = page.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(4);

  const bodyRows = await rows.all();
  for (const row of bodyRows.slice(1)) {
    const cells = await row.getByRole('cell').allTextContents();
    const buy = Number(cells[1]?.replaceAll('.', ''));
    const sell = Number(cells[2]?.replaceAll('.', ''));
    expect(sell).toBeGreaterThanOrEqual(buy);
  }
});

test('trang giá vàng trong nước không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/gia-vang-trong-nuoc');
  await expect(page.getByRole('table')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('chuyển theme Dark blue ↔ Light ngay trên trang, bảng giá không vỡ', async ({ page }) => {
  await page.goto('/gia-vang-trong-nuoc');

  const toggle = page.getByRole('button', { name: /Chuyển sang nền/ });
  await expect(toggle).toHaveAccessibleName('Chuyển sang nền sáng');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');

  await toggle.click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Chuyển sang nền tối');
  await expect(page.getByRole('table')).toBeVisible();
});

test('link "Giá vàng trong nước" từ trang chủ điều hướng đúng', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Giá vàng trong nước' }).click();
  await expect(page).toHaveURL(/\/gia-vang-trong-nuoc$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Giá vàng trong nước' })).toBeVisible();
});
