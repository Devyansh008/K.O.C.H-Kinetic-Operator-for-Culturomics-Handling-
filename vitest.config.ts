import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/integration/0*.test.ts'],
    testTimeout: 30000,
  },
});
