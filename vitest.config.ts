import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The suite only exercises pure helpers; a `localStorage` stub (see
    // test/setup.ts) is all the browser API they touch, so no jsdom.
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.js'],
  },
});
