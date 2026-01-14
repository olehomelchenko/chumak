import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import { plugin as markdown, Mode } from 'vite-plugin-markdown';

export default defineConfig({
  // For GitHub Pages: set base to repo name
  // Change '/chumak/' to '/' for custom domain or local dev
  base: '/chumak/',
  plugins: [
    preact({
      // Only process JSX/TSX files, not regular TS (which may use decorators)
      include: ['**/*.tsx', '**/*.jsx'],
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markdown({ mode: [Mode.HTML] }) as any,
  ],
  css: {
    postcss: {
      plugins: [nested(), autoprefixer()],
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{js,ts,tsx}'],
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
