/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the demo from /<repository>/; everywhere else the app lives at the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    css: {
      modules: { classNameStrategy: 'non-scoped' },
    },
  },
});
