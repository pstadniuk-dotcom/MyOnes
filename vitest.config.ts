import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'server/__tests__/test-utils.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.test.ts', 'server/__tests__/**'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
