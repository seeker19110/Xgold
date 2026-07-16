import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Luồng "phân tích kết hợp + gợi ý mua/bán" (Đợt 7 — kế hoạch xgold-development-plan.md mục 4):
 * khối gợi ý hiển thị kèm disclaimer, tắt hết quy tắc về trạng thái rỗng hợp lệ, đổi khung
 * thời gian tín hiệu tính lại theo khung mới.
 */

test('khối phân tích hiển thị gợi ý + disclaimer bắt buộc', async ({ page }) => {
  await page.goto('/chart/xauusd');

  await expect(page.getByRole('heading', { name: /Phân tích kết hợp/ })).toBeVisible();
  // Gợi ý tổng hợp (Mua/Bán/Trung lập) hiển thị kèm điểm số.
  await expect(page.getByText(/Thiên MUA|Thiên BÁN|TRUNG LẬP/)).toBeVisible();
  await expect(page.getByText(/điểm [+-]?\d/)).toBeVisible();
  // Disclaimer pháp lý bắt buộc (ADR-0007) — luôn hiển thị, kể cả khi tắt phân tích. Từ Đợt 10,
  // confluence-panel (bên dưới) cũng mang cùng disclaimer dùng chung → scope vào khối phân tích để
  // tránh strict-mode violation (2 khối cùng có chữ này là ĐÚNG, không phải lỗi).
  await expect(
    page
      .getByRole('region', { name: 'Phân tích kết hợp — tín hiệu kỹ thuật' })
      .getByText('không phải lời khuyên đầu tư'),
  ).toBeVisible();
});

test('tắt hết quy tắc → trạng thái rỗng hợp lệ, không còn gợi ý', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByText(/Thiên MUA|Thiên BÁN|TRUNG LẬP/)).toBeVisible();

  for (const checkbox of await page.getByRole('checkbox', { name: /^Bật\/tắt quy tắc/ }).all()) {
    await checkbox.uncheck();
  }

  await expect(page.getByText('Chưa có quy tắc nào được bật')).toBeVisible();
  await expect(page.getByText(/Thiên MUA|Thiên BÁN|TRUNG LẬP/)).toBeHidden();
});

test('tắt toàn bộ phân tích → ẩn gợi ý lẫn danh sách quy tắc, disclaimer vẫn còn', async ({
  page,
}) => {
  await page.goto('/chart/xauusd');

  await page.getByRole('checkbox', { name: 'Bật/tắt phân tích kết hợp' }).uncheck();

  await expect(page.getByText(/Thiên MUA|Thiên BÁN|TRUNG LẬP/)).toBeHidden();
  await expect(page.getByRole('checkbox', { name: /^Bật\/tắt quy tắc/ })).toHaveCount(0);
  // Cùng lý do scope ở test trên — confluence-panel bên dưới cũng mang disclaimer dùng chung.
  await expect(
    page
      .getByRole('region', { name: 'Phân tích kết hợp — tín hiệu kỹ thuật' })
      .getByText('không phải lời khuyên đầu tư'),
  ).toBeVisible();
});

test('đổi khung thời gian → tín hiệu ghi rõ khung mới đang chọn', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByText(/khung 1h đang chọn/)).toBeVisible();

  await page.getByRole('button', { name: 'D', exact: true }).click();
  await expect(page.getByText(/khung 1D đang chọn/)).toBeVisible();
});

test('khối phân tích không có vi phạm accessibility nghiêm trọng', async ({ page }) => {
  await page.goto('/chart/xauusd');
  await expect(page.getByRole('heading', { name: /Phân tích kết hợp/ })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
