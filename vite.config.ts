import { defineConfig } from 'vitest/config';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import { plugin as markdown, Mode } from 'vite-plugin-markdown';

export default defineConfig({
  // For GitHub Pages: set base to repo name
  // Change '/chumak/' to '/' for custom domain or local dev
  base: '/chumak/',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [markdown({ mode: [Mode.HTML] }) as any],
  css: {
    postcss: {
      plugins: [nested(), autoprefixer()],
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom', // Better for browser-like testing
    include: ['src/**/*.test.{js,ts}'],
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
