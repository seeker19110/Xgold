import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * W-508 — hộp tìm mã nhanh (Ctrl+K / Cmd+K hoặc nút 🔍 cạnh SymbolSwitcher). Xem
 * `components/chart/symbol-search.tsx` + unit test `symbol-search.test.tsx` (logic mở/đóng/lọc/focus
 * đã kiểm ở tầng jsdom). Bộ E2E này xác nhận thêm hành vi chỉ có ở trình duyệt thật: phím tắt bắt
 * được khi KHÔNG focus vào input nào (focus đang ở <body>/nút khác), điều hướng đổi URL thật.
 *
 * Ghi chú môi trường: Playwright có thể KHÔNG chạy được trong sandbox hiện tại (chưa cài trình
 * duyệt/tải bị chặn) — xem CLAUDE.md + PLAN.md. Đã viết đủ theo mẫu `e2e/multi-symbol.spec.ts`.
 */

test('Ctrl+K mở hộp tìm mã từ trang chart (không cần bấm nút 🔍 trước)', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { level: 1, name: 'XAU/USD' })).toBeVisible();

  await page.keyboard.press('Control+k');

  const dialog = page.getByRole('dialog', { name: 'Tìm mã' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Tìm mã' })).toBeFocused();
});

test('gõ lọc ra đúng 1 mã, chọn bằng click → điều hướng đúng URL', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await page.keyboard.press('Control+k');

  const dialog = page.getByRole('dialog', { name: 'Tìm mã' });
  await dialog.getByRole('textbox', { name: 'Tìm mã' }).fill('xagusd');

  await expect(dialog.getByRole('button', { name: /XAG\/USD/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /XAU\/USD/ })).not.toBeVisible();

  await dialog.getByRole('button', { name: /XAG\/USD/ }).click();

  await expect(page).toHaveURL(/\/chart\/xagusd(\?.*)?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'XAG/USD' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('gõ lọc ra đúng 1 mã rồi bấm Enter → điều hướng đúng URL', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await page.keyboard.press('Control+k');

  const dialog = page.getByRole('dialog', { name: 'Tìm mã' });
  const input = dialog.getByRole('textbox', { name: 'Tìm mã' });
  await input.fill('dxy');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/chart\/dxy(\?.*)?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'DXY' })).toBeVisible();
});

test('Esc đóng hộp tìm mã và trả focus về nút 🔍', async ({ page }) => {
  await page.goto('/chart/xauusd');
  const trigger = page.getByRole('button', { name: 'Tìm mã (Ctrl+K)' });
  await trigger.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('click ra ngoài hộp thoại đóng hộp tìm mã', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await page.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Click góc trên bên trái màn hình — ngoài hộp thoại (max-w-md, căn giữa, pt-24).
  await page.mouse.click(5, 5);

  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('hộp tìm mã không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await page.getByRole('button', { name: 'Tìm mã (Ctrl+K)' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
