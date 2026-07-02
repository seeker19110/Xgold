// Flat config (ESLint 9/10). Next.js 16 đã loại bỏ lệnh `next lint`; chạy ESLint trực tiếp qua `npm run lint`.
// eslint-config-next (Next 16+) export flat config qua subpath riêng — không cần FlatCompat nữa
// (bản FlatCompat cũ gây lỗi "Converting circular structure to JSON" trên eslint-config-next hiện tại).
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));

const eslintConfig = defineConfig([
  // eslint-config-next đã gồm React, React Hooks và một bộ rule jsx-a11y cốt lõi.
  ...nextVitals,
  ...nextTs,

  {
    files: ['**/*.{ts,tsx}'],
    // Bật lint dựa trên kiểu (type-aware) để rule no-floating-promises hoạt động.
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      // Siết thêm vài rule accessibility (plugin jsx-a11y đã được next đăng ký):
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
    },
  },

  globalIgnores([
    '.next/**',
    'coverage/**',
    'playwright-report/**',
    'public/sw.js',
    'next-env.d.ts',
    // Chưa merge/xoá dropins thì đừng để ESLint quét — xem new-project-runbook.md Bước 0/3.
    '_framework-dropins/**',
  ]),
]);

export default eslintConfig;
