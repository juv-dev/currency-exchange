import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const excludeFolders = [
  'src/assets/**',
  'src/style.css',
  'src/vite-env.d.ts',
];

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['./test/**/*.{test,spec}.ts'],
    exclude: [...configDefaults.exclude, ...excludeFolders],
    setupFiles: fileURLToPath(new URL('./test/setup.ts', import.meta.url)),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      reportsDirectory: './coverage',
      exclude: [
        'src/main.ts',
        'src/App.vue',
        'src/**/*.d.ts',
      ],
      include: ['src/**/*.{js,ts,vue}'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['vue'],
  },
});
