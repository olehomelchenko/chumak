/**
 * Shared configuration for content pages.
 *
 * Used by both the build script (build-content-pages.ts) and
 * the Vite dev plugin (vite-plugin-content-pages.ts).
 */

export interface PageDef {
  /** Path to markdown source relative to src/content/ */
  markdown: string;
  /** Output path relative to dist/ (must end with index.html) */
  output: string;
  /** Page <title> */
  title: string;
  /** Meta description */
  description: string;
  /** Which nav item is active: 'about' | 'docs' | null */
  activeNav: 'about' | 'docs' | null;
  /** Sidebar section id (for docs pages) */
  sidebarId?: string;
}

export const SITE_ORIGIN = 'https://syto.pages.dev';

export const pages: PageDef[] = [
  // About
  {
    markdown: 'about.md',
    output: 'about/index.html',
    title: 'About',
    description:
      'Syto is a browser-based data wrangling tool for cleaning and transforming tabular data.',
    activeNav: 'about',
  },
  // Docs index (getting started)
  {
    markdown: 'getting-started.md',
    output: 'docs/index.html',
    title: 'Getting Started',
    description:
      'Learn how to import, transform, and export data with Syto — a browser-based data wrangling tool.',
    activeNav: 'docs',
    sidebarId: 'getting-started',
  },
  // Function reference pages
  {
    markdown: 'functions/operators.md',
    output: 'docs/operators/index.html',
    title: 'Operators',
    description: 'Arithmetic, comparison, logical, and special operators in Syto expressions.',
    activeNav: 'docs',
    sidebarId: 'operators',
  },
  {
    markdown: 'functions/date.md',
    output: 'docs/date/index.html',
    title: 'Date Functions',
    description: 'Date parsing, extraction, and manipulation functions in Syto.',
    activeNav: 'docs',
    sidebarId: 'date',
  },
  {
    markdown: 'functions/text.md',
    output: 'docs/text/index.html',
    title: 'Text Functions',
    description: 'String manipulation and text processing functions in Syto.',
    activeNav: 'docs',
    sidebarId: 'text',
  },
  {
    markdown: 'functions/math.md',
    output: 'docs/math/index.html',
    title: 'Math Functions',
    description: 'Mathematical and numeric functions in Syto expressions.',
    activeNav: 'docs',
    sidebarId: 'math',
  },
  {
    markdown: 'functions/regex.md',
    output: 'docs/regex/index.html',
    title: 'Regex Functions',
    description: 'Regular expression functions for pattern matching in Syto.',
    activeNav: 'docs',
    sidebarId: 'regex',
  },
  {
    markdown: 'functions/conversion.md',
    output: 'docs/conversion/index.html',
    title: 'Conversion Functions',
    description: 'Type conversion and casting functions in Syto.',
    activeNav: 'docs',
    sidebarId: 'conversion',
  },
  {
    markdown: 'functions/json.md',
    output: 'docs/json/index.html',
    title: 'JSON Functions',
    description: 'JSON parsing and extraction functions in Syto.',
    activeNav: 'docs',
    sidebarId: 'json',
  },
  {
    markdown: 'functions/aggregate.md',
    output: 'docs/aggregate/index.html',
    title: 'Aggregate Functions',
    description: 'Aggregation and summary functions in Syto.',
    activeNav: 'docs',
    sidebarId: 'aggregate',
  },
  // Other docs
  {
    markdown: 'shortcuts.md',
    output: 'docs/shortcuts/index.html',
    title: 'Keyboard Shortcuts',
    description: 'Keyboard shortcuts for navigating and using Syto efficiently.',
    activeNav: 'docs',
    sidebarId: 'shortcuts',
  },
  {
    markdown: 'whats-new.md',
    output: 'docs/whats-new/index.html',
    title: "What's New",
    description: 'Recent features and updates in Syto.',
    activeNav: 'docs',
    sidebarId: 'whats-new',
  },
];

// ---------------------------------------------------------------------------
// Sidebar structure (mirrors FunctionReferenceDialog.tsx)
// ---------------------------------------------------------------------------

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
}

export const sidebarGroups: SidebarItem[][] = [
  [{ id: 'getting-started', label: 'Getting Started', href: '/docs/' }],
  [
    { id: 'operators', label: 'Operators', href: '/docs/operators/' },
    { id: 'date', label: 'Date', href: '/docs/date/' },
    { id: 'text', label: 'Text', href: '/docs/text/' },
    { id: 'math', label: 'Math', href: '/docs/math/' },
    { id: 'regex', label: 'Regex', href: '/docs/regex/' },
    { id: 'conversion', label: 'Conversion', href: '/docs/conversion/' },
    { id: 'json', label: 'JSON', href: '/docs/json/' },
    { id: 'aggregate', label: 'Aggregate', href: '/docs/aggregate/' },
  ],
  [
    { id: 'shortcuts', label: 'Shortcuts', href: '/docs/shortcuts/' },
    { id: 'whats-new', label: "What's New", href: '/docs/whats-new/' },
  ],
];

// ---------------------------------------------------------------------------
// Shared rendering helpers
// ---------------------------------------------------------------------------

export function renderSidebar(activeId: string): string {
  const parts: string[] = ['<nav class="docs-sidebar">'];
  for (let i = 0; i < sidebarGroups.length; i++) {
    if (i > 0) parts.push('  <hr />');
    for (const item of sidebarGroups[i]) {
      const current = item.id === activeId ? ' aria-current="page"' : '';
      parts.push(`  <a href="${item.href}"${current}>${item.label}</a>`);
    }
  }
  parts.push('</nav>');
  return parts.join('\n');
}

/**
 * Build a route map from the pages array (used by the dev plugin).
 */
export function buildRouteMap(): Record<
  string,
  {
    markdown: string;
    title: string;
    description: string;
    activeNav: 'about' | 'docs' | null;
    sidebarId?: string;
  }
> {
  const routes: Record<string, any> = {};
  for (const page of pages) {
    // Derive route from output path: "about/index.html" → "/about/"
    const dir = page.output.replace(/\/index\.html$/, '');
    const route = `/${dir}/`;
    routes[route] = {
      markdown: page.markdown,
      title: page.title,
      description: page.description,
      activeNav: page.activeNav,
      sidebarId: page.sidebarId,
    };
  }
  return routes;
}
