import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import { plugin as markdown, Mode } from 'vite-plugin-markdown';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    // For Cloudflare Pages: use root path
    // Change '/' to '/syto/' for GitHub Pages subdirectory
    base: '/',
    plugins: [
      preact({
        // Only process JSX/TSX files, not regular TS (which may use decorators)
        include: ['**/*.tsx', '**/*.jsx'],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markdown({ mode: [Mode.HTML] }) as any,
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Ensure navigation requests (page loads) use cache
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
          runtimeCaching: [
            // Cache external fonts (Google Fonts)
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache iconify icons
            {
              urlPattern: /^https:\/\/code\.iconify\.design\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'iconify-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache normalize.css from unpkg
            {
              urlPattern: /^https:\/\/unpkg\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unpkg-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Syto — Data Wrangling in the Browser',
          short_name: 'Syto',
          description:
            'Browser-based data wrangling tool for cleaning and transforming tabular data',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
      }),
    ],
    css: {
      modules: {
        // Enhanced class names in dev for better debugging
        // Dev: includes file name and local class name, e.g., "DataTable__cell___abc12"
        // Prod: shorter hash-only names for smaller bundle size
        generateScopedName: isDev
          ? (name: string, filename: string) => {
              // Extract just the filename (without path and extension)
              const basename = path.basename(filename, '.module.css');
              // Generate a short hash from filename + name for uniqueness
              const hashInput = `${filename}${name}`;
              const hash = Buffer.from(hashInput)
                .toString('base64')
                .substring(0, 5)
                .replace(/[^a-zA-Z0-9]/g, '');
              return `${basename}__${name}___${hash}`;
            }
          : '[hash:base64:8]', // Production: short hash only
      },
      // Enable source maps in dev for CSS debugging
      devSourcemap: isDev,
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
      // Optimize CSS in production
      cssMinify: !isDev,
      // Increase chunk size warning limit - Vega is legitimately large
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split Vega libraries (large visualization libraries)
            if (id.includes('vega') || id.includes('vega-lite') || id.includes('vega-embed')) {
              return 'vega';
            }
            // Split Arquero (data processing library)
            if (id.includes('arquero')) {
              return 'arquero';
            }
            // Split Preact and related libraries
            if (id.includes('preact') || id.includes('@preact')) {
              return 'preact';
            }
            // Split parsing libraries
            if (id.includes('papaparse')) {
              return 'parsers';
            }
            if (id.includes('jsep')) {
              return 'parsers';
            }
            // Split PWA/workbox
            if (id.includes('workbox') || id.includes('vite-plugin-pwa')) {
              return 'pwa';
            }
            // Split CodeMirror (editor library)
            if (id.includes('@codemirror') || id.includes('codemirror')) {
              return 'codemirror';
            }
            // Keep other node_modules vendor code separate
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
