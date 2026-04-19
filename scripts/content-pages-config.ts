/**
 * Shared configuration for content pages.
 *
 * Used by both the build script (build-content-pages.ts) and
 * the Vite dev plugin (vite-plugin-content-pages.ts).
 */

import * as path from 'path';

// ---------------------------------------------------------------------------
// Locale support
// ---------------------------------------------------------------------------

export type Locale = 'en' | 'uk';
export const LOCALES: Locale[] = ['en', 'uk'];
export const DEFAULT_LOCALE: Locale = 'en';

export interface LocaleStrings {
  navAbout: string;
  navDocs: string;
  navTools: string;
  navCta: string;
  footerText: string;
  footerLinkText: string;
  langSwitcherLabel: string;
}

export const localeStrings: Record<Locale, LocaleStrings> = {
  en: {
    navAbout: 'About',
    navDocs: 'Docs',
    navTools: 'Tools',
    navCta: 'Open App',
    footerText: 'Syto — Data wrangling in the browser.',
    footerLinkText: 'Open source',
    langSwitcherLabel: 'UK',
  },
  uk: {
    navAbout: 'Про Syto',
    navDocs: 'Документація',
    navTools: 'Інструменти',
    navCta: 'Відкрити',
    footerText: 'Syto — Обробка даних у браузері.',
    footerLinkText: 'Відкритий код',
    langSwitcherLabel: 'EN',
  },
};

// ---------------------------------------------------------------------------
// Page definitions
// ---------------------------------------------------------------------------

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
    markdown: 'functions/let-bindings.md',
    output: 'docs/let-bindings/index.html',
    title: 'Let Bindings',
    description: 'Name intermediate values and reuse them inside a Syto expression.',
    activeNav: 'docs',
    sidebarId: 'let-bindings',
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
// Ukrainian page metadata (titles + descriptions for <head>)
// ---------------------------------------------------------------------------

interface LocalePageMeta {
  title: string;
  description: string;
}

/** Keyed by the English markdown filename (serves as page identity). */
export const ukPageMeta: Record<string, LocalePageMeta> = {
  'about.md': {
    title: 'Про Syto',
    description: 'Syto — інструмент для очищення та трансформації табличних даних у браузері.',
  },
  'getting-started.md': {
    title: 'Початок роботи',
    description:
      'Дізнайтеся, як імпортувати, трансформувати та експортувати дані за допомогою Syto.',
  },
  'functions/operators.md': {
    title: 'Оператори',
    description: 'Арифметичні, порівняльні, логічні та спеціальні оператори у виразах Syto.',
  },
  'functions/let-bindings.md': {
    title: 'Локальні імена (let)',
    description:
      'Іменуйте проміжні значення й повторно використовуйте їх у межах одного виразу Syto.',
  },
  'functions/date.md': {
    title: 'Функції дати',
    description: 'Функції розбору, вилучення та маніпуляції датами в Syto.',
  },
  'functions/text.md': {
    title: 'Текстові функції',
    description: 'Функції обробки рядків та тексту в Syto.',
  },
  'functions/math.md': {
    title: 'Математичні функції',
    description: 'Математичні та числові функції у виразах Syto.',
  },
  'functions/regex.md': {
    title: 'Функції регулярних виразів',
    description: 'Функції регулярних виразів для пошуку за шаблоном у Syto.',
  },
  'functions/conversion.md': {
    title: 'Функції конвертації',
    description: 'Функції перетворення типів у Syto.',
  },
  'functions/json.md': {
    title: 'Функції JSON',
    description: 'Функції розбору та вилучення даних з JSON у Syto.',
  },
  'functions/aggregate.md': {
    title: 'Агрегатні функції',
    description: 'Функції агрегації та підсумків у Syto.',
  },
  'shortcuts.md': {
    title: 'Комбінації клавіш',
    description: 'Комбінації клавіш для ефективної роботи з Syto.',
  },
  'whats-new.md': {
    title: 'Що нового',
    description: 'Нові функції та оновлення Syto.',
  },
};

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
    { id: 'let-bindings', label: 'Let Bindings', href: '/docs/let-bindings/' },
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

/** Ukrainian sidebar labels keyed by sidebar item id. */
const ukSidebarLabels: Record<string, string> = {
  'getting-started': 'Початок роботи',
  operators: 'Оператори',
  'let-bindings': 'Локальні імена (let)',
  date: 'Дата',
  text: 'Текст',
  math: 'Математика',
  regex: 'Регулярні вирази',
  conversion: 'Конвертація',
  json: 'JSON',
  aggregate: 'Агрегація',
  shortcuts: 'Комбінації клавіш',
  'whats-new': 'Що нового',
};

// ---------------------------------------------------------------------------
// URL + hreflang helpers (used by both build script and dev plugin)
// ---------------------------------------------------------------------------

export function pageUrl(page: PageDef, locale: Locale): string {
  const dir = path.dirname(page.output);
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return `${SITE_ORIGIN}${prefix}/${dir}/`;
}

export function buildHreflangTags(page: PageDef): string {
  const enUrl = pageUrl(page, 'en');
  const ukUrl = pageUrl(page, 'uk');
  return [
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link rel="alternate" hreflang="uk" href="${ukUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
  ].join('\n    ');
}

export function langSwitchHref(page: PageDef, currentLocale: Locale): string {
  const dir = path.dirname(page.output);
  if (currentLocale === 'en') return `/uk/${dir}/`;
  return `/${dir}/`;
}

/** Find the PageDef that corresponds to a route's markdown path. */
export function findPageDef(markdown: string): PageDef | undefined {
  const key = markdown.replace(/^uk\//, '');
  return pages.find((p) => p.markdown === key);
}

// ---------------------------------------------------------------------------
// Shared rendering helpers
// ---------------------------------------------------------------------------

export function renderSidebar(activeId: string, locale: Locale = 'en'): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const parts: string[] = ['<nav class="docs-sidebar">'];
  for (let i = 0; i < sidebarGroups.length; i++) {
    if (i > 0) parts.push('  <hr />');
    for (const item of sidebarGroups[i]) {
      const current = item.id === activeId ? ' aria-current="page"' : '';
      const label = locale === 'uk' ? (ukSidebarLabels[item.id] ?? item.label) : item.label;
      const href = `${prefix}${item.href}`;
      parts.push(`  <a href="${href}"${current}>${label}</a>`);
    }
  }
  parts.push('</nav>');
  return parts.join('\n');
}

/**
 * Build a route map from the pages array (used by the dev plugin).
 */
export interface RouteInfo {
  markdown: string;
  title: string;
  description: string;
  activeNav: 'about' | 'docs' | null;
  sidebarId?: string;
  locale: Locale;
}

export function buildRouteMap(): Record<string, RouteInfo> {
  const routes: Record<string, RouteInfo> = {};
  for (const locale of LOCALES) {
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    for (const page of pages) {
      const dir = page.output.replace(/\/index\.html$/, '');
      const route = `${prefix}/${dir}/`;

      const meta = locale === 'uk' ? ukPageMeta[page.markdown] : undefined;
      routes[route] = {
        markdown: locale === DEFAULT_LOCALE ? page.markdown : `uk/${page.markdown}`,
        title: meta?.title ?? page.title,
        description: meta?.description ?? page.description,
        activeNav: page.activeNav,
        sidebarId: page.sidebarId,
        locale,
      };
    }
  }
  return routes;
}
