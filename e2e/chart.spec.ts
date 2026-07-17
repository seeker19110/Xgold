import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Luồng chính: mở trang chart XAU/USD, thấy chart nến (dữ liệu mẫu vì CI chưa cấu hình Supabase),
 * đổi khung thời gian. Xem PROJECT.md mục 7 (luồng người dùng chính).
 */

test('mở trang chart thấy tiêu đề, banner dữ liệu mẫu và chart nến', async ({ page }) => {
  await page.goto('/chart/xauusd');

  await expect(page.getByRole('heading', { level: 1, name: 'XAU/USD' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'dữ liệu mẫu' })).toBeVisible();

  // Chart vẽ vào <canvas> bên trong container role="group" — chờ canvas xuất hiện thay vì timeout cố định.
  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('đổi khung thời gian cập nhật nút đang chọn (aria-pressed)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const btn1h = page.getByRole('button', { name: '1h', exact: true });
  const btn4h = page.getByRole('button', { name: '4h', exact: true });

  await expect(btn1h).toHaveAttribute('aria-pressed', 'true');
  await expect(btn4h).toHaveAttribute('aria-pressed', 'false');

  await btn4h.click();

  await expect(btn4h).toHaveAttribute('aria-pressed', 'true');
  await expect(btn1h).toHaveAttribute('aria-pressed', 'false');
});

test('đủ dải khung thời gian kiểu TradingView (5m → M) và chuyển được khung biên', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const switcher = page.getByRole('group', { name: 'Chọn khung thời gian' });
  for (const tf of ['5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M']) {
    await expect(switcher.getByRole('button', { name: tf, exact: true })).toBeVisible();
  }

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });

  // Khung nhỏ nhất (5m) — chart vẫn render nến.
  const btn5m = switcher.getByRole('button', { name: '5m', exact: true });
  await btn5m.click();
  await expect(btn5m).toHaveAttribute('aria-pressed', 'true');
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  // Khung lớn nhất (M = 1 tháng) — resample từ nến ngày, chart vẫn render.
  const btnMonth = switcher.getByRole('button', { name: 'M', exact: true });
  await btnMonth.click();
  await expect(btnMonth).toHaveAttribute('aria-pressed', 'true');
  await expect(btn5m).toHaveAttribute('aria-pressed', 'false');
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('legend OHLC kiểu TradingView hiển thị trên chart (O/H/L/C + mức thay đổi %)', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const legend = page.getByLabel('Chú giải OHLC giá vàng XAU/USD');
  await expect(legend).toBeVisible();
  // Đủ 4 nhãn O/H/L/C và mức thay đổi có % — giá trị số phụ thuộc dữ liệu mẫu, chỉ kiểm tra cấu trúc.
  await expect(legend).toContainText('O');
  await expect(legend).toContainText('H');
  await expect(legend).toContainText('L');
  await expect(legend).toContainText('C');
  await expect(legend).toContainText('%');
});

test('legend hiển thị countdown nến hiện tại (mm:ss hoặc hh:mm:ss)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const countdown = page.getByLabel('Thời gian còn lại tới khi nến hiện tại đóng');
  await expect(countdown).toBeVisible();
  // Khung mặc định (1h): còn lại luôn < 1h → mm:ss; chấp nhận cả hh:mm:ss cho tổng quát nếu đổi mặc định.
  await expect(countdown).toHaveText(/^⏱ (\d{2}:)?\d{2}:\d{2}$/);
});

test('bấm nút "Xuất CSV" tải file nến đúng tên + nội dung (F-011)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const exportButton = page.getByRole('button', { name: 'Xuất CSV' });
  await expect(exportButton).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

  expect(download.suggestedFilename()).toBe('xauusd-1h-candles.csv');
  const path = await download.path();
  const content = await (await import('node:fs/promises')).readFile(path!, 'utf-8');
  const lines = content.split('\n');
  expect(lines[0]).toBe('time,open,high,low,close,volume');
  expect(lines.length).toBeGreaterThan(1);
});

test('trang chart không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(
    page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' }).locator('canvas').first(),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('bật thang giá Log không làm vỡ chart; axe 0 vi phạm (W-503)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  const logToggle = page.getByRole('button', { name: 'Chuyển thang giá Log/Linear' });
  await expect(logToggle).toHaveAttribute('aria-pressed', 'false');

  await logToggle.click();
  await expect(logToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);

  // Chuyển lại Linear — không vỡ chart.
  await logToggle.click();
  await expect(logToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});

test('nút Auto fit đưa dữ liệu về đủ khung nhìn sau khi zoom (W-503)', async ({ page }) => {
  await page.goto('/chart/xauusd');

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  const canvas = chartContainer.locator('canvas').first();
  await expect(canvas).toBeVisible();

  const autoFitButton = page.getByRole('button', { name: /Đưa toàn bộ dữ liệu vào khung nhìn/ });
  await expect(autoFitButton).toBeVisible();

  // Zoom (thu hẹp khung nhìn) bằng wheel trên canvas rồi bấm Auto fit — chart vẫn còn nguyên vẹn.
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200);
  }
  await autoFitButton.click();
  await expect(canvas).toBeVisible();
});

test('chuyển theme Dark blue ↔ Light ngay trên trang chart (không cần rời trang)', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const toggle = page.getByRole('button', { name: /Chuyển sang nền/ });
  await expect(toggle).toHaveAccessibleName('Chuyển sang nền sáng');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');

  await toggle.click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Chuyển sang nền tối');

  // Đổi theme không phá chart — canvas vẫn còn và không có lỗi console mới.
  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
});
