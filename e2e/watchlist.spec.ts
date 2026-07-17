import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * W-509 — Watchlist (danh sách mã đã ghim, lưu localStorage). Logic persistence + dựng dòng đã kiểm
 * ở tầng jsdom (`use-watchlist.test.ts`, `use-watchlist-rows.test.ts`, `watchlist-panel.test.tsx`,
 * `lib/screener/row.test.ts`, `lib/watchlist/types.test.ts`). Bộ E2E này xác nhận hành vi chỉ có ở
 * trình duyệt thật: ghim/bỏ ghim hiển thị đúng, TRẠNG THÁI SỐNG SÓT qua reload (localStorage), bố
 * cục desktop (cột phải) vs mobile (sheet trượt lên), axe 0 vi phạm.
 *
 * Ghi chú môi trường: Playwright có thể KHÔNG chạy được trong sandbox hiện tại (chưa cài trình
 * duyệt / tải bị chặn) — xem CLAUDE.md + PLAN.md. Đã viết đủ theo mẫu `e2e/symbol-search.spec.ts`.
 */

const PIN_BUTTON = 'Ghim XAU/USD vào danh sách theo dõi';
const UNPIN_HEADER = 'Bỏ ghim XAU/USD khỏi danh sách theo dõi';

async function gotoChart(page: Page) {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { level: 1, name: 'XAU/USD' })).toBeVisible();
}

test.describe('desktop (cột phải)', () => {
  test('ghim mã → xuất hiện trong watchlist; reload giữ trạng thái; bỏ ghim → biến mất', async ({
    page,
  }) => {
    await gotoChart(page);

    const aside = page.getByRole('complementary', { name: 'Danh sách theo dõi' });
    await expect(aside.getByText(/Chưa ghim mã nào/)).toBeVisible();

    // Ghim mã đang xem qua nút ★ trên header.
    await page.getByRole('button', { name: PIN_BUTTON }).click();
    await expect(aside.getByRole('link', { name: /XAU\/USD/ })).toBeVisible();

    // Sống sót qua reload (localStorage).
    await page.reload();
    await expect(
      page
        .getByRole('complementary', { name: 'Danh sách theo dõi' })
        .getByRole('link', { name: /XAU\/USD/ }),
    ).toBeVisible();

    // Bỏ ghim từ header → biến mất.
    await page.getByRole('button', { name: UNPIN_HEADER }).click();
    await expect(
      page.getByRole('complementary', { name: 'Danh sách theo dõi' }).getByText(/Chưa ghim mã nào/),
    ).toBeVisible();
  });

  test('cột watchlist không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
    await gotoChart(page);
    await page.getByRole('button', { name: PIN_BUTTON }).click();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('mobile (sheet)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('nút nổi mở sheet; ghim rồi reload giữ trạng thái; bỏ ghim trong sheet', async ({
    page,
  }) => {
    await gotoChart(page);

    // Ghim mã đang xem.
    await page.getByRole('button', { name: PIN_BUTTON }).click();

    // Mở sheet từ nút nổi.
    await page.getByRole('button', { name: 'Mở danh sách theo dõi' }).click();
    const sheet = page.getByRole('dialog', { name: /Theo dõi/ });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: /XAU\/USD/ })).toBeVisible();

    // Đóng sheet, reload, mở lại → vẫn còn.
    await sheet.getByRole('button', { name: 'Đóng danh sách theo dõi' }).first().click();
    await page.reload();
    await page.getByRole('button', { name: 'Mở danh sách theo dõi' }).click();
    const sheetAfter = page.getByRole('dialog', { name: /Theo dõi/ });
    await expect(sheetAfter.getByRole('link', { name: /XAU\/USD/ })).toBeVisible();

    // Bỏ ghim trong sheet.
    await sheetAfter.getByRole('button', { name: UNPIN_HEADER }).click();
    await expect(sheetAfter.getByText(/Chưa ghim mã nào/)).toBeVisible();
  });

  test('sheet mở không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
    await gotoChart(page);
    await page.getByRole('button', { name: PIN_BUTTON }).click();
    await page.getByRole('button', { name: 'Mở danh sách theo dõi' }).click();
    await expect(page.getByRole('dialog', { name: /Theo dõi/ })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
