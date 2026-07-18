import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * W-512 — bố cục thanh công cụ vẽ (thu gọn/mở rộng desktop, mobile không che chart) + đúng loại
 * công cụ được vẽ (đường ngang, Fibonacci — trendline đã kiểm ở `e2e/chart.spec.ts`) + nút
 * "Chọn"/"Xoá hết". Logic chọn công cụ/gọi callback đã kiểm ở tầng jsdom
 * (`drawing-toolbar.test.tsx`, `use-drawings.test.ts`); bộ E2E này xác nhận hành vi chỉ có ở
 * trình duyệt thật: click 2 điểm trên canvas thật ra đúng loại nét, bố cục responsive, axe.
 *
 * Ghi chú môi trường: Playwright có thể KHÔNG chạy được trong sandbox hiện tại (tải trình duyệt bị
 * chặn) — xem CLAUDE.md/PLAN.md. Đã viết đủ theo mẫu `e2e/chart.spec.ts`/`e2e/watchlist.spec.ts`.
 */

async function gotoChart(page: Page) {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { level: 1, name: 'XAU/USD' })).toBeVisible();
}

async function drawnCount(page: Page, type?: string): Promise<number> {
  return page.evaluate((filterType) => {
    const entry = Object.entries(localStorage).find(([k]) => k.startsWith('xgold:drawings:'));
    if (!entry) return 0;
    const list = JSON.parse(entry[1]) as { type: string }[];
    return filterType ? list.filter((d) => d.type === filterType).length : list.length;
  }, type);
}

test.describe('desktop — cột dọc bên trái chart', () => {
  // Ép viewport desktop tường minh — bố cục toolbar (cột dọc vs thanh ngang) phụ thuộc bề rộng màn
  // hình, không phải project Playwright đang chạy (`--project=mobile` vẫn chạy hết test trong file
  // này, chỉ khác device mặc định) — thiếu dòng này, describe "desktop" bị chạy ở viewport hẹp khi
  // project=mobile.
  test.use({ viewport: { width: 1280, height: 800 } });

  test('chọn "Ngang" → click 1 điểm ra đường ngang, không phải trendline', async ({ page }) => {
    await gotoChart(page);
    const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
    const canvas = chartContainer.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    const horizontalBtn = toolbar.getByRole('button', { name: 'Ngang' });
    await horizontalBtn.click();
    await expect(horizontalBtn).toHaveAttribute('aria-pressed', 'true');

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas không có bounding box');
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

    expect(await drawnCount(page, 'horizontal-line')).toBe(1);
    expect(await drawnCount(page, 'trendline')).toBe(0);
    await expect(horizontalBtn).toHaveAttribute('aria-pressed', 'false'); // tự tắt sau khi vẽ xong
  });

  test('chọn "Fibonacci" → click 2 điểm ra fib-retracement, không phải trendline/đường ngang', async ({
    page,
  }) => {
    await gotoChart(page);
    const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
    const canvas = chartContainer.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    const fibBtn = toolbar.getByRole('button', { name: 'Fibonacci' });
    await fibBtn.click();
    await expect(fibBtn).toHaveAttribute('aria-pressed', 'true');

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas không có bounding box');
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
    // Chờ >500ms giữa 2 click: lightweight-charts phát hiện double-click trong ngưỡng 500ms
    // (`Delay.ResetClick`) — click quá gần nhau bị hiểu nhầm thành 1 cử chỉ, click thứ 2 không tính.
    await page.waitForTimeout(800);
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);

    expect(await drawnCount(page, 'fib-retracement')).toBe(1);
    expect(await drawnCount(page, 'trendline')).toBe(0);
    expect(await drawnCount(page, 'horizontal-line')).toBe(0);
  });

  test('nút "Chọn" đưa về chế độ chọn (thoát chế độ vẽ đang bật)', async ({ page }) => {
    await gotoChart(page);
    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    const trendlineBtn = toolbar.getByRole('button', { name: 'Xu hướng' });
    const selectBtn = toolbar.getByRole('button', { name: 'Chọn', exact: true });

    await expect(selectBtn).toHaveAttribute('aria-pressed', 'true'); // mặc định ở chế độ chọn
    await trendlineBtn.click();
    await expect(trendlineBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(selectBtn).toHaveAttribute('aria-pressed', 'false');

    await selectBtn.click();

    await expect(selectBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(trendlineBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('"Xoá hết" xoá toàn bộ nét vẽ đã lưu', async ({ page }) => {
    await gotoChart(page);
    const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
    const canvas = chartContainer.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas không có bounding box');

    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    await toolbar.getByRole('button', { name: 'Ngang' }).click();
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
    // Chờ >500ms trước khi bắt đầu nét TIẾP THEO — ngưỡng double-click 500ms của lightweight-charts
    // (`Delay.ResetClick`) áp dụng cho MỌI cặp click canvas liên tiếp, không chỉ 2 điểm cùng 1 nét;
    // thiếu chờ ở đây khiến click đầu của trendline bị tính gộp với click vừa vẽ xong đường ngang.
    await page.waitForTimeout(800);
    await toolbar.getByRole('button', { name: 'Xu hướng' }).click();
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.6);
    // Chờ >500ms giữa 2 click của trendline — tránh bị lightweight-charts hiểu nhầm double-click
    // (xem ghi chú `Delay.ResetClick` ở trên).
    await page.waitForTimeout(800);
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);

    expect(await drawnCount(page)).toBe(2);

    await toolbar.getByRole('button', { name: 'Xoá hết nét vẽ' }).click();

    expect(await drawnCount(page)).toBe(0);
  });

  test('thu gọn/mở rộng thanh công cụ', async ({ page }) => {
    await gotoChart(page);
    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    await expect(toolbar.getByRole('button', { name: 'Chọn', exact: true })).toBeVisible();

    await toolbar.getByRole('button', { name: 'Thu gọn thanh công cụ vẽ' }).click();
    await expect(toolbar.getByRole('button', { name: 'Chọn', exact: true })).toBeHidden();

    await toolbar.getByRole('button', { name: 'Mở rộng thanh công cụ vẽ' }).click();
    await expect(toolbar.getByRole('button', { name: 'Chọn', exact: true })).toBeVisible();
  });

  test('thanh công cụ vẽ không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
    await gotoChart(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('mobile — thanh ngang phía trên chart', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('thanh công cụ hiển thị, không che chart, chọn công cụ vẫn hoạt động', async ({ page }) => {
    await gotoChart(page);
    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    await expect(toolbar).toBeVisible();

    const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
    const canvas = chartContainer.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Thanh công cụ và chart không chồng lên nhau (bố cục dọc: toolbar nằm phía trên chart).
    const toolbarBox = await toolbar.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!toolbarBox || !canvasBox) throw new Error('thiếu bounding box');
    expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(canvasBox.y + 1);

    const trendlineBtn = toolbar.getByRole('button', { name: 'Xu hướng' });
    await trendlineBtn.click();
    await expect(trendlineBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('thanh công cụ vẽ không có vi phạm accessibility nghiêm trọng (mobile)', async ({
    page,
  }) => {
    await gotoChart(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
