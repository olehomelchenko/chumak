import { Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { syncDialogToUrl } from '../orchestration/UrlStateSync';
import { html as operatorsHtml } from '../../content/functions/operators.md';
import { html as regexHtml } from '../../content/functions/regex.md';
import { html as dateHtml } from '../../content/functions/date.md';
import { html as textHtml } from '../../content/functions/text.md';
import { html as mathHtml } from '../../content/functions/math.md';
import { html as conversionHtml } from '../../content/functions/conversion.md';
import { html as jsonHtml } from '../../content/functions/json.md';
import { html as aggregateHtml } from '../../content/functions/aggregate.md';
import { html as gettingStartedHtml } from '../../content/getting-started.md';
import { html as shortcutsHtml } from '../../content/shortcuts.md';
import { html as whatsNewHtml } from '../../content/whats-new.md';
import styles from './FunctionReferenceDialog.module.css';

interface Category {
  id: string;
  label: string;
  html: string;
}

const sidebarGroups: Category[][] = [
  // Guide
  [{ id: 'getting-started', label: 'Getting Started', html: gettingStartedHtml }],
  // Expression functions
  [
    { id: 'operators', label: 'Operators', html: operatorsHtml },
    { id: 'date', label: 'Date', html: dateHtml },
    { id: 'text', label: 'Text', html: textHtml },
    { id: 'math', label: 'Math', html: mathHtml },
    { id: 'regex', label: 'Regex', html: regexHtml },
    { id: 'conversion', label: 'Conversion', html: conversionHtml },
    { id: 'json', label: 'JSON', html: jsonHtml },
    { id: 'aggregate', label: 'Aggregate', html: aggregateHtml },
  ],
  // Extras
  [
    { id: 'shortcuts', label: 'Shortcuts', html: shortcutsHtml },
    { id: 'whats-new', label: "What's New", html: whatsNewHtml },
  ],
];

const allCategories = sidebarGroups.flat();

export function FunctionReferenceDialog({ section }: { section?: string } = {}) {
  // See dialog-registry.ts reference.initState for why globalThis is used here
  const initialSection = section || (globalThis as any).__referenceSection || 'getting-started';
  const [activeCategory, setActiveCategory] = useState(
    allCategories.some((c) => c.id === initialSection) ? initialSection : 'getting-started'
  );

  useEffect(() => {
    delete (globalThis as any).__referenceSection;
  }, []);

  const activeCategoryData = allCategories.find((cat) => cat.id === activeCategory);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.categoryList}>
          {sidebarGroups.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              {groupIndex > 0 && <hr className={styles.categorySeparator} />}
              {group.map((item) => (
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
                  {item.label}
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className={styles.content}>
        {activeCategoryData && (
          <div
            className={styles.documentation}
            dangerouslySetInnerHTML={{ __html: activeCategoryData.html }}
          />
        )}
      </div>
    </div>
  );
}
