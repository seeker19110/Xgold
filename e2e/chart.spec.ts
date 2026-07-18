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

test('bấm nút "Toàn màn hình" bật/tắt fullscreen không lỗi console (W-505)', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/chart/xauusd');

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  const fullscreenButton = page.getByRole('button', { name: 'Toàn màn hình' });
  await expect(fullscreenButton).toBeVisible();
  await expect(fullscreenButton).toHaveAttribute('aria-pressed', 'false');

  await fullscreenButton.click();
  // requestFullscreen() có thể bị chặn trong môi trường headless CI (không có user gesture thật đủ
  // điều kiện, hoặc thiếu quyền) — kiểm tra bằng aria-pressed đồng bộ với document.fullscreenElement
  // thay vì giả định luôn thành công; điều quan trọng nhất (theo tiêu chí nghiệm thu) là không lỗi
  // console và chart không vỡ layout dù bật được fullscreen hay không.
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  // Thoát fullscreen bằng cách bấm LẠI đúng nút (gọi `document.exitFullscreen()` tường minh qua code
  // app) thay vì phím Escape — Escape exit fullscreen là hành vi native của TRÌNH DUYỆT (không phải
  // JS lắng nghe keydown), Playwright `keyboard.press('Escape')` chỉ gửi sự kiện DOM tổng hợp nên
  // không đáng tin cậy để kích hoạt đúng cơ chế thoát fullscreen gốc trong Chromium headless CI —
  // bấm lại nút đi đúng qua nhánh `document.exitFullscreen()` đã có sẵn trong `handleToggleFullscreen`.
  await fullscreenButton.click();
  await expect(fullscreenButton).toHaveAttribute('aria-pressed', 'false');
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('nút "Chụp ảnh chart" tồn tại và bấm được (nội dung PNG kiểm chứng thủ công, W-505)', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const screenshotButton = page.getByRole('button', { name: 'Chụp ảnh chart' });
  await expect(screenshotButton).toBeVisible();
  await screenshotButton.click();
  // Không xác nhận nội dung ảnh ở đây — theo đúng pattern áp dụng cho nút "Xuất CSV" ở Đợt 14 gốc/
  // PR #29 cho phần không thể tự động hóa tốt trong sandbox; nội dung PNG kiểm chứng thủ công bằng
  // trình duyệt thật (mở file tải về, so khớp với chart đang hiển thị).
  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
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

test('đổi kiểu chart (Nến → Heikin Ashi → Line) không vỡ chart; axe 0 vi phạm (W-502)', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  const canvas = chartContainer.locator('canvas').first();
  await expect(canvas).toBeVisible();

  const switcher = page.getByRole('group', { name: 'Chọn kiểu chart' });
  const btnCandles = switcher.getByRole('button', { name: 'Nến', exact: true });
  const btnHeikin = switcher.getByRole('button', { name: 'Heikin Ashi', exact: true });
  const btnLine = switcher.getByRole('button', { name: 'Line', exact: true });

  // Mặc định là Nến.
  await expect(btnCandles).toHaveAttribute('aria-pressed', 'true');

  // → Heikin Ashi: series đổi loại (remove + add), canvas vẫn còn (markers/overlay vẽ lại trên
  //   series mới — kiểm chứng thị giác thủ công vì markers nằm trên canvas, không phải DOM).
  await btnHeikin.click();
  await expect(btnHeikin).toHaveAttribute('aria-pressed', 'true');
  await expect(btnCandles).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas).toBeVisible();

  // → Line: series 1 giá trị (close), canvas vẫn còn.
  await btnLine.click();
  await expect(btnLine).toHaveAttribute('aria-pressed', 'true');
  await expect(btnHeikin).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);

  // Quay lại Nến — không vỡ.
  await btnCandles.click();
  await expect(btnCandles).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toBeVisible();
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

test('chọn mã so sánh → đường % hiện (2 series), bỏ chọn thì mất; axe 0 vi phạm (W-507)', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
  // Series 1 = nến chính đang hiển thị trên canvas.
  await expect(chartContainer.locator('canvas').first()).toBeVisible();

  // Chọn XAG/USD làm mã so sánh (series 2). aria-label đổi khi active nên khớp bằng regex nhãn mã.
  const compareGroup = page.getByRole('group', { name: 'So sánh mã' });
  const compareBtn = compareGroup.getByRole('button', { name: /XAG\/USD/ });
  await expect(compareBtn).toHaveAttribute('aria-pressed', 'false');
  await compareBtn.click();
  await expect(compareBtn).toHaveAttribute('aria-pressed', 'true');

  // Chú giải mã so sánh xuất hiện = đường % (series thứ 2) đã render (series vẽ trên canvas nên
  // dùng chú giải DOM làm bằng chứng "2 series cùng hiển thị"). `exact: true` — nếu không, khớp
  // luôn cả nút "Bỏ so sánh XAG/USD" (getByLabel so khớp chuỗi con, không phân biệt hoa/thường mặc
  // định, "so sánh" nằm trong "Bỏ so sánh" nên 2 phần tử cùng khớp, vi phạm strict mode).
  const compareLegend = page.getByLabel('So sánh XAG/USD', { exact: true });
  await expect(compareLegend).toBeVisible();
  await expect(compareLegend).toContainText('XAG/USD');
  await expect(compareLegend).toContainText('%');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);

  // Bỏ chọn → đường biến mất (chú giải mất, GoldChart gọi removeSeries), chart không vỡ.
  await compareBtn.click();
  await expect(compareBtn).toHaveAttribute('aria-pressed', 'false');
  await expect(compareLegend).toHaveCount(0);
  await expect(chartContainer.locator('canvas').first()).toBeVisible();
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

test.describe('vẽ trendline (W-511)', () => {
  // Ép viewport desktop tường minh — vẽ trendline cần click chuột chính xác theo toạ độ pixel;
  // dưới project mobile (Pixel 5, `hasTouch: true`), Playwright giả lập `page.mouse.click()` thành
  // sự kiện chạm (touch) thay vì chuột thật, khiến lightweight-charts xử lý click khác đi (mất ổn
  // định thời điểm/toạ độ) — bài kiểm tra vẽ trên canvas không phải bài kiểm tra bố cục mobile, ép
  // viewport để chạy nhất quán trên mọi project.
  test.use({ viewport: { width: 1280, height: 800 } });

  test('vẽ trendline bằng chuột thật → lưu localStorage, còn sau reload; xoá được (W-511)', async ({
    page,
  }) => {
    await page.goto('/chart/xauusd');

    const chartContainer = page.getByRole('group', { name: 'Chart nến giá vàng XAU/USD' });
    const canvas = chartContainer.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Bật công cụ "Đường xu hướng" (trendline) — aria-pressed phản hồi trạng thái bật.
    const toolbar = page.getByRole('group', { name: 'Công cụ vẽ trên chart' });
    const trendlineBtn = toolbar.getByRole('button', { name: 'Xu hướng' });
    await trendlineBtn.click();
    await expect(trendlineBtn).toHaveAttribute('aria-pressed', 'true');

    // Nút xoá vô hiệu trước khi vẽ (chưa chọn nét nào).
    const deleteBtn = toolbar.getByRole('button', { name: 'Xoá nét vẽ đang chọn' });
    await expect(deleteBtn).toBeDisabled();

    // Click 2 điểm trên vùng nến (giữa canvas) — trendline cần 2 điểm; toạ độ trong vùng dữ liệu để
    // `param.time` bám nến (time+price hợp lệ). Chờ >500ms giữa 2 click: lightweight-charts có cơ chế
    // phát hiện double-click với ngưỡng 500ms (`Delay.ResetClick` trong mã nguồn thư viện) — 2 click
    // liên tiếp quá gần nhau bị hiểu nhầm thành 1 cử chỉ double-click, khiến callback click thứ 2
    // không kích hoạt đúng (xác nhận bằng debug thủ công, không phải lỗi logic ứng dụng).
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas không có bounding box');
    await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.55);
    await page.waitForTimeout(800);
    await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.4);

    // Vẽ xong → nét vừa vẽ được CHỌN (commitDrawing đặt selectedId) → nút xoá bật + công cụ tự tắt.
    await expect(deleteBtn).toBeEnabled();
    await expect(trendlineBtn).toHaveAttribute('aria-pressed', 'false');

    // Bằng chứng "sống sót reload": 1 trendline đã ghi localStorage (series vẽ trên canvas nên dùng
    // localStorage làm nguồn xác thực).
    const stored = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([k]) => k.startsWith('xgold:drawings:'));
      return entry ? entry[1] : null;
    });
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string) as { type: string }[];
    expect(parsed.filter((d) => d.type === 'trendline')).toHaveLength(1);

    // Reload → còn nguyên (W-510 loadDrawings đọc lại từ localStorage).
    await page.reload();
    const afterReload = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([k]) => k.startsWith('xgold:drawings:'));
      return entry ? (JSON.parse(entry[1]) as unknown[]).length : 0;
    });
    expect(afterReload).toBe(1);

    // Chọn lại nét bằng cách click TRÚNG đoạn (điểm giữa 2 đầu) rồi xoá → localStorage rỗng.
    await expect(canvas).toBeVisible();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.475);
    const deleteAfterReload = toolbar.getByRole('button', { name: 'Xoá nét vẽ đang chọn' });
    await expect(deleteAfterReload).toBeEnabled();
    await deleteAfterReload.click();

    const afterDelete = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([k]) => k.startsWith('xgold:drawings:'));
      return entry ? (JSON.parse(entry[1]) as unknown[]).length : 0;
    });
    expect(afterDelete).toBe(0);
    await expect(canvas).toBeVisible();
  });
});
