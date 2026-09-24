import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 30000,
    setupFiles: ['test/integration/setup.ts'],
  },
});
