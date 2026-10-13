import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Two kinds of test live in this project:
 *
 *   src/lib/*.test.ts        pure signal-processing maths, no DOM
 *   src/*.smoke.test.tsx     renders the real pages and clicks the real
 *                            controls, to catch runtime errors that the type
 *                            checker cannot see
 *
 * happy-dom is used rather than jsdom because it starts faster and this suite
 * only needs ordinary DOM, events and layout-free rendering.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
