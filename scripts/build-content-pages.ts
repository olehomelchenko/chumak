#!/usr/bin/env tsx
/**
 * Static Content Page Generator
 *
 * Runs after `vite build` and generates standalone HTML pages into dist/.
 * Content pages are zero-JS static HTML that share the app's visual identity
 * through a standalone CSS file.
 *
 * Follows the pattern of scripts/generate-function-docs.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import postcss from 'postcss';
import nested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import { pages, SITE_ORIGIN, renderSidebar } from './content-pages-config';

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

  // Generate each page
  for (const page of pages) {
    const mdPath = path.join(contentDir, page.markdown);
    if (!fs.existsSync(mdPath)) {
      console.warn(`⚠ Skipping ${page.markdown} — file not found`);
      continue;
    }

    const mdSource = fs.readFileSync(mdPath, 'utf-8');
    const htmlContent = await marked.parse(mdSource);

    // Build sidebar (only for docs pages)
    const hasSidebar = page.sidebarId != null;
    const sidebar = hasSidebar ? renderSidebar(page.sidebarId!) : '';
    const layoutClass = hasSidebar ? 'page-layout--with-sidebar' : '';

    // Nav highlights
    const navAbout = page.activeNav === 'about' ? 'aria-current="page"' : '';
    const navDocs = page.activeNav === 'docs' ? 'aria-current="page"' : '';

    // Canonical URL
    const outputDir = path.dirname(page.output);
    const canonical = `${SITE_ORIGIN}/${outputDir}/`;

    // Fill template
    let html = template;
    html = html.replace(/\{\{title\}\}/g, page.title);
    html = html.replace(/\{\{description\}\}/g, page.description);
    html = html.replace(/\{\{canonical\}\}/g, canonical);
    html = html.replace(/\{\{content\}\}/g, htmlContent);
    html = html.replace(/\{\{sidebar\}\}/g, sidebar);
    html = html.replace(/\{\{layout-class\}\}/g, layoutClass);
    html = html.replace(/\{\{nav-about\}\}/g, navAbout);
    html = html.replace(/\{\{nav-docs\}\}/g, navDocs);
    html = html.replace(/\{\{css-href\}\}/g, '/content.css');
    html = html.replace(/\{\{analytics\}\}/g, analyticsSnippet);

    // Write output
    const outPath = path.join(distDir, page.output);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outPath, html);
    console.log(`✓ Generated ${page.output}`);
  }

  console.log(`\n✅ Built ${pages.length} content pages`);
}

main().catch((err) => {
  console.error('✗ Content page build failed:', err);
  process.exit(1);
});
