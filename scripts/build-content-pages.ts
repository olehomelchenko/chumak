#!/usr/bin/env tsx
/**
 * Static Content Page Generator
 *
 * Runs after `vite build` and generates standalone HTML pages into dist/.
 * Content pages are zero-JS static HTML that share the app's visual identity
 * through a standalone CSS file.
 *
 * Generates pages for all supported locales (en at root, uk at /uk/).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import postcss from 'postcss';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import {
  pages,
  renderSidebar,
  LOCALES,
  DEFAULT_LOCALE,
  localeStrings,
  ukPageMeta,
  pageUrl,
  buildHreflangTags,
  langSwitchHref,
  type Locale,
  type PageDef,
} from './content-pages-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Analytics snippet (no import.meta.env — use plain inline script)
// ---------------------------------------------------------------------------

const analyticsSnippet = `
    <script>
      // GoatCounter analytics — privacy-respecting, GDPR-compliant
      // Respects the same opt-out preference as the main app
      (function () {
        var shouldLoad = true;
        try {
          var settings = localStorage.getItem('syto-ux-settings');
          if (settings) {
            var parsed = JSON.parse(settings);
            if (parsed.analyticsOptOut === true) shouldLoad = false;
          }
        } catch (e) {}
        if (shouldLoad) {
          var s = document.createElement('script');
          s.setAttribute('data-goatcounter', 'https://syto.goatcounter.com/count');
          s.async = true;
          s.src = '//gc.zgo.at/count.js';
          document.head.appendChild(s);
        }
      })();
    </script>`;

// ---------------------------------------------------------------------------
// CSS processing
// ---------------------------------------------------------------------------

async function processCSS(): Promise<string> {
  const cssPath = path.join(ROOT, 'styles/content.css');
  const cssSource = fs.readFileSync(cssPath, 'utf-8');

  // Resolve @import inline so PostCSS can process the full file
  const resolved = cssSource.replace(/@import\s+['"](.+?)['"]\s*;/g, (_match, importPath) => {
    const fullPath = path.join(ROOT, 'styles', importPath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
    console.warn(`⚠ CSS import not found: ${fullPath}`);
    return '';
  });

  const result = await postcss([nested(), autoprefixer()]).process(resolved, { from: cssPath });
  return result.css;
}

function fillTemplate(
  template: string,
  page: PageDef,
  locale: Locale,
  htmlContent: string
): string {
  const strings = localeStrings[locale];
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  const meta = locale === 'uk' ? ukPageMeta[page.markdown] : undefined;
  const title = meta?.title ?? page.title;
  const description = meta?.description ?? page.description;

  const hasSidebar = page.sidebarId != null;
  const sidebar = hasSidebar ? renderSidebar(page.sidebarId!, locale) : '';
  const layoutClass = hasSidebar ? 'page-layout--with-sidebar' : '';

  const navAbout = page.activeNav === 'about' ? 'aria-current="page"' : '';
  const navDocs = page.activeNav === 'docs' ? 'aria-current="page"' : '';
  const canonical = pageUrl(page, locale);

  let html = template;
  html = html.replace(/\{\{lang\}\}/g, locale);
  html = html.replace(/\{\{title\}\}/g, title);
  html = html.replace(/\{\{description\}\}/g, description);
  html = html.replace(/\{\{canonical\}\}/g, canonical);
  html = html.replace(/\{\{hreflang-tags\}\}/g, buildHreflangTags(page));
  html = html.replace(/\{\{content\}\}/g, htmlContent);
  html = html.replace(/\{\{sidebar\}\}/g, sidebar);
  html = html.replace(/\{\{layout-class\}\}/g, layoutClass);
  html = html.replace(/\{\{nav-about\}\}/g, navAbout);
  html = html.replace(/\{\{nav-docs\}\}/g, navDocs);
  html = html.replace(/\{\{home-href\}\}/g, prefix ? `${prefix}/` : '/');
  html = html.replace(/\{\{about-href\}\}/g, `${prefix}/about/`);
  html = html.replace(/\{\{docs-href\}\}/g, `${prefix}/docs/`);
  html = html.replace(/\{\{nav-about-label\}\}/g, strings.navAbout);
  html = html.replace(/\{\{nav-docs-label\}\}/g, strings.navDocs);
  html = html.replace(/\{\{tools-href\}\}/g, '/tools/json-to-csv/');
  html = html.replace(/\{\{nav-tools-label\}\}/g, strings.navTools);
  html = html.replace(/\{\{nav-cta-label\}\}/g, strings.navCta);
  html = html.replace(/\{\{lang-switch-href\}\}/g, langSwitchHref(page, locale));
  html = html.replace(/\{\{lang-switch-label\}\}/g, strings.langSwitcherLabel);
  html = html.replace(/\{\{footer-text\}\}/g, strings.footerText);
  html = html.replace(/\{\{footer-link-text\}\}/g, strings.footerLinkText);
  html = html.replace(/\{\{css-href\}\}/g, '/content.css');
  html = html.replace(/\{\{analytics\}\}/g, analyticsSnippet);

  return html;
}

// ---------------------------------------------------------------------------
// Landing page post-processing (generates /uk/ landing from built EN landing)
// ---------------------------------------------------------------------------

function buildUkLanding(distDir: string): void {
  const enLanding = path.join(distDir, 'index.html');
  if (!fs.existsSync(enLanding)) {
    console.warn('⚠ dist/index.html not found — skipping UK landing page');
    return;
  }

  let html = fs.readFileSync(enLanding, 'utf-8');

  // lang attribute
  html = html.replace('<html lang="en">', '<html lang="uk">');

  // Page title + meta description
  html = html.replace(
    '<title>Syto — Data Wrangling in the Browser</title>',
    '<title>Syto — Обробка даних у браузері</title>'
  );
  html = html.replace(
    'content="Browser-based data wrangling tool for cleaning and transforming tabular data. No installation required."',
    'content="Браузерний інструмент для очищення та трансформації табличних даних. Не потребує встановлення."'
  );

  // Nav labels
  html = html.replace('>About</a>', '>Про Syto</a>');
  html = html.replace('>Docs</a>', '>Документація</a>');
  html = html.replace('>Tools</a>', '>Інструменти</a>');
  html = html.replace('>Open App</a>', '>Відкрити</a>');

  // Hero content
  html = html.replace(
    'Data wrangling in the browser — clean, transform, and prepare your data without installing\n          anything.',
    'Обробка даних у браузері — очищуйте, трансформуйте та готуйте дані без встановлення програм.'
  );
  html = html.replace(
    '>Open App</a>\n          <a href="/docs/" class="hero__link">Read the docs</a>',
    '>Відкрити</a>\n          <a href="/uk/docs/" class="hero__link">Документація</a>'
  );
  html = html.replace(
    'No installation, no accounts, no uploads. Your data stays in your browser.',
    'Без встановлення, без реєстрації, без завантаження на сервер. Ваші дані залишаються у вашому браузері.'
  );

  // Footer
  html = html.replace('Syto — Data wrangling in the browser.', 'Syto — Обробка даних у браузері.');
  html = html.replace('>Open source</a>', '>Відкритий код</a>');

  // Nav links — prefix with /uk/ for about and docs
  html = html.replace('href="/about/"', 'href="/uk/about/"');
  html = html.replace('href="/docs/"', 'href="/uk/docs/"');

  // Language switcher: replace the UK link with EN link
  html = html.replace(
    '<a href="/uk/" class="site-header__lang">UK</a>',
    '<a href="/" class="site-header__lang">EN</a>'
  );

  // Home link
  html = html.replace(
    'href="/" class="site-header__logo"',
    'href="/uk/" class="site-header__logo"'
  );

  const outDir = path.join(distDir, 'uk');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('✓ Generated uk/index.html (landing)');
}

// ---------------------------------------------------------------------------
// Page generation
// ---------------------------------------------------------------------------

async function main() {
  const distDir = path.join(ROOT, 'dist');
  const contentDir = path.join(ROOT, 'src/content');
  const templatePath = path.join(contentDir, 'templates/page-shell.html');

  // Ensure dist exists (vite build should have created it)
  if (!fs.existsSync(distDir)) {
    console.error('✗ dist/ directory not found — run vite build first');
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  // Process and write CSS
  const processedCSS = await processCSS();
  fs.writeFileSync(path.join(distDir, 'content.css'), processedCSS);
  console.log('✓ Processed content.css');

  // Generate pages for each locale
  let count = 0;
  for (const locale of LOCALES) {
    for (const page of pages) {
      const mdRelative = locale === DEFAULT_LOCALE ? page.markdown : `uk/${page.markdown}`;
      const mdPath = path.join(contentDir, mdRelative);
      if (!fs.existsSync(mdPath)) {
        console.warn(`⚠ Skipping ${mdRelative} — file not found`);
        continue;
      }

      const mdSource = fs.readFileSync(mdPath, 'utf-8');
      const htmlContent = await marked.parse(mdSource);
      const html = fillTemplate(template, page, locale, htmlContent);

      // EN → "about/index.html", UK → "uk/about/index.html"
      const outputFile = locale === DEFAULT_LOCALE ? page.output : `uk/${page.output}`;
      const outPath = path.join(distDir, outputFile);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(outPath, html);
      console.log(`✓ Generated ${outputFile}`);
      count++;
    }
  }

  // Generate UK landing page from built EN landing
  buildUkLanding(distDir);

  console.log(`\n✅ Built ${count} content pages`);
}

main().catch((err) => {
  console.error('✗ Content page build failed:', err);
  process.exit(1);
});
