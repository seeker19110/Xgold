import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Loại E2E (Playwright) khỏi Vitest — hai bộ chạy riêng.
    exclude: ['node_modules', 'e2e', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // `include` tường minh (F-003, docs/ops/COMPLETION-PLAN.md): thiếu `include` thì v8 chỉ tính %
      // trên các file ĐÃ được test import — file 0-test (route API, hook, component) vắng mặt khỏi
      // báo cáo, khiến % nhìn cao giả tạo và ngưỡng dưới không thực sự chặn được việc thiếu test.
      // Vitest 4 không còn cờ `all` riêng — khai `include` là đủ để quét cả file chưa có test nào
      // import tới (đã xác nhận bằng cách chạy thử: thiếu include thì % không đổi so với trước).
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      // Sàn an toàn tối thiểu (KHÔNG phải mục tiêu) — bắt việc "quên viết test".
      // Ưu tiên chất lượng test ở đường đi quan trọng + ca biên hơn con số %.
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
      exclude: [
        'e2e/**',
        '**/*.config.*',
        '**/*.d.ts',
        'vitest.setup.ts',
        // Boilerplate framework Next.js không có logic nghiệp vụ (không phải "né test khó viết").
        'app/error.tsx',
        'app/global-error.tsx',
        'app/not-found.tsx',
        'app/manifest.ts',
        'app/robots.ts',
        'app/sitemap.ts',
        'app/sw.ts',
        'app/layout.tsx',
        // Canvas API mệnh lệnh (lightweight-charts) — không unit test theo dòng có ý nghĩa được,
        // che bằng E2E thật (e2e/chart.spec.ts, e2e/indicators.spec.ts) thay vì mock canvas giả.
        'components/chart/gold-chart.tsx',
        // Trang route (App Router) chỉ export metadata/gọi *-client — logic thật nằm ở nơi khác,
        // che bằng E2E: e2e/smoke.spec.ts (/), e2e/chart.spec.ts (/chart/xauusd),
        // e2e/domestic-gold.spec.ts (/gia-vang-trong-nuoc).
        'app/page.tsx',
        'app/chart/[symbol]/page.tsx',
        'app/gia-vang-trong-nuoc/page.tsx',
        'app/quet-tin-hieu/page.tsx',
        // Component thuần trình bày/tổ hợp (không có nhánh logic riêng đáng unit test) — che bằng
        // cùng bộ E2E ở trên (indicators.spec.ts test trực tiếp thao tác trên indicator-panel.tsx).
        'components/chart/indicator-panel.tsx',
        'components/chart/timeframe-switcher.tsx',
        'components/chart/symbol-switcher.tsx',
        'components/domestic-gold/price-table.tsx',
        'components/domestic-gold/freshness-badge.tsx',
        // Đợt 10 (bề mặt phân tích) — component/trang thuần trình bày, logic thật (computeConfluence,
        // ratio/pearson, use-confluence, use-screener) đã có unit test riêng ở lib/analysis + hook
        // test. Che bằng E2E: e2e/confluence.spec.ts, e2e/screener.spec.ts.
        'components/chart/analysis-disclaimer.tsx',
        'components/chart/confluence-panel.tsx',
        'components/screener/screener-table.tsx',
        'components/screener/market-context.tsx',
        'app/quet-tin-hieu/page-client.tsx',
        // Watchlist (W-509, Đợt 15): container đáp ứng (cột phải desktop + sheet mobile + nút nổi) —
        // hook persistence/fetch + panel trình bày đã có unit test riêng (use-watchlist.test.ts,
        // use-watchlist-rows.test.ts, watchlist-panel.test.tsx). Che phần lắp ráp bằng E2E:
        // e2e/watchlist.spec.ts.
        'components/watchlist/watchlist.tsx',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
