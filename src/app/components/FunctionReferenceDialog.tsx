import { Fragment } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { syncDialogToUrl } from '../orchestration/UrlStateSync';

// English content
import { html as enOperators } from '../../content/functions/operators.md';
import { html as enLetBindings } from '../../content/functions/let-bindings.md';
import { html as enRegex } from '../../content/functions/regex.md';
import { html as enDate } from '../../content/functions/date.md';
import { html as enText } from '../../content/functions/text.md';
import { html as enMath } from '../../content/functions/math.md';
import { html as enConversion } from '../../content/functions/conversion.md';
import { html as enJson } from '../../content/functions/json.md';
import { html as enAggregate } from '../../content/functions/aggregate.md';
import { html as enGettingStarted } from '../../content/getting-started.md';
import { html as enShortcuts } from '../../content/shortcuts.md';

// Ukrainian content
import { html as ukOperators } from '../../content/uk/functions/operators.md';
import { html as ukLetBindings } from '../../content/uk/functions/let-bindings.md';
import { html as ukRegex } from '../../content/uk/functions/regex.md';
import { html as ukDate } from '../../content/uk/functions/date.md';
import { html as ukText } from '../../content/uk/functions/text.md';
import { html as ukMath } from '../../content/uk/functions/math.md';
import { html as ukConversion } from '../../content/uk/functions/conversion.md';
import { html as ukJson } from '../../content/uk/functions/json.md';
import { html as ukAggregate } from '../../content/uk/functions/aggregate.md';
import { html as ukGettingStarted } from '../../content/uk/getting-started.md';
import { html as ukShortcuts } from '../../content/uk/shortcuts.md';

import styles from './FunctionReferenceDialog.module.css';

const contentByLocale: Record<string, Record<string, string>> = {
  en: {
    'getting-started': enGettingStarted,
    operators: enOperators,
    'let-bindings': enLetBindings,
    date: enDate,
    text: enText,
    math: enMath,
    regex: enRegex,
    conversion: enConversion,
    json: enJson,
    aggregate: enAggregate,
    shortcuts: enShortcuts,
  },
  uk: {
    'getting-started': ukGettingStarted,
    operators: ukOperators,
    'let-bindings': ukLetBindings,
    date: ukDate,
    text: ukText,
    math: ukMath,
    regex: ukRegex,
    conversion: ukConversion,
    json: ukJson,
    aggregate: ukAggregate,
    shortcuts: ukShortcuts,
  },
};

type SidebarItem =
  | { kind: 'internal'; id: string }
  | { kind: 'external'; id: string; href: string };

const sidebarGroups: SidebarItem[][] = [
  [{ kind: 'internal', id: 'getting-started' }],
  [
    { kind: 'internal', id: 'operators' },
    { kind: 'internal', id: 'let-bindings' },
    { kind: 'internal', id: 'date' },
    { kind: 'internal', id: 'text' },
    { kind: 'internal', id: 'math' },
    { kind: 'internal', id: 'regex' },
    { kind: 'internal', id: 'conversion' },
    { kind: 'internal', id: 'json' },
    { kind: 'internal', id: 'aggregate' },
  ],
  [
    { kind: 'internal', id: 'shortcuts' },
    {
      kind: 'external',
      id: 'whats-new',
      href: 'https://github.com/olehomelchenko/syto/releases',
    },
  ],
];

const internalSectionIds = sidebarGroups
  .flat()
  .filter((item): item is Extract<SidebarItem, { kind: 'internal' }> => item.kind === 'internal')
  .map((item) => item.id);

export function FunctionReferenceDialog({ section }: { section?: string } = {}) {
  const { t, i18n } = useTranslation('dialogs');
  const lang = i18n.language;

  // See dialog-registry.ts reference.initState for why globalThis is used here
  const initialSection = section || (globalThis as any).__referenceSection || 'getting-started';
  const [activeCategory, setActiveCategory] = useState(
    internalSectionIds.includes(initialSection) ? initialSection : 'getting-started'
  );
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    delete (globalThis as any).__referenceSection;
  }, []);

  // Filter sidebar sections by search text (searches HTML content stripped of tags)
  const matchingSections = useMemo(() => {
    if (!searchText) return null;
    const lower = searchText.toLowerCase();
    const locale = contentByLocale[lang] || contentByLocale.en;
    return internalSectionIds.filter((id) => {
      const html = locale[id] || contentByLocale.en[id] || '';
      const text = html.replace(/<[^>]+>/g, '').toLowerCase();
      return text.includes(lower);
    });
  }, [searchText, lang]);

  // Auto-select first matching category when search filters results
  useEffect(() => {
    if (
      matchingSections &&
      matchingSections.length > 0 &&
      !matchingSections.includes(activeCategory)
    ) {
      setActiveCategory(matchingSections[0]);
    }
  }, [matchingSections]);

  const content = contentByLocale[lang]?.[activeCategory] ?? contentByLocale.en[activeCategory];
  const docsHref = lang === 'uk' ? '/uk/docs/' : '/docs/';

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <a
          href={docsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.openInNewTab}
        >
          {t('referencePage.openInNewTab')} &#8599;
        </a>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('referencePage.searchPlaceholder')}
            value={searchText}
            onInput={(e) => setSearchText(e.currentTarget.value)}
          />
        </div>
        <div className={styles.categoryList}>
          {sidebarGroups.map((group, groupIndex) => {
            const filtered = matchingSections
              ? group.filter(
                  (item) => item.kind === 'external' || matchingSections.includes(item.id)
                )
              : group;
            if (filtered.length === 0) return null;
            return (
              <Fragment key={groupIndex}>
                {groupIndex > 0 && filtered.length > 0 && (
                  <hr className={styles.categorySeparator} />
                )}
                {filtered.map((item) =>
                  item.kind === 'external' ? (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.categoryButton}
                    >
                      {t(`referencePage.sidebar.${item.id}`)} &#8599;
                    </a>
                  ) : (
                    <button
                      key={item.id}
                      className={`${styles.categoryButton} ${
                        activeCategory === item.id ? styles.active : ''
                      }`}
                      onClick={() => {
                        setActiveCategory(item.id);
                        syncDialogToUrl('reference', item.id);
                      }}
                    >
                      {t(`referencePage.sidebar.${item.id}`)}
                    </button>
                  )
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
      <div className={styles.content}>
        {content && (
          <div className={styles.documentation} dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
    </div>
  );
}
