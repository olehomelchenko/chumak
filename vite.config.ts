import { defineConfig } from 'vitest/config';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [],
  css: {
    postcss: {
      plugins: [
        nested(),
        autoprefixer()
      ],
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom', // Better for browser-like testing
    include: ['src/**/*.test.{js,ts}'],
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
});
