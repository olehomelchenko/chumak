import { useState } from 'preact/hooks';
import { html as operatorsHtml } from '../../content/functions/operators.md';
import { html as regexHtml } from '../../content/functions/regex.md';
import { html as dateHtml } from '../../content/functions/date.md';
import { html as textHtml } from '../../content/functions/text.md';
import { html as mathHtml } from '../../content/functions/math.md';
import { html as conversionHtml } from '../../content/functions/conversion.md';
import styles from './FunctionReferenceDialog.module.css';

interface Category {
  id: string;
  label: string;
  html: string;
}

const categories: Category[] = [
  { id: 'operators', label: 'Operators', html: operatorsHtml },
  { id: 'date', label: 'Date', html: dateHtml },
  { id: 'text', label: 'Text', html: textHtml },
  { id: 'math', label: 'Math', html: mathHtml },
  { id: 'regex', label: 'Regex', html: regexHtml },
  { id: 'conversion', label: 'Conversion', html: conversionHtml },
];

export function FunctionReferenceDialog() {
  const [activeCategory, setActiveCategory] = useState('operators');

  const activeCategoryData = categories.find((cat) => cat.id === activeCategory);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryButton} ${
                activeCategory === category.id ? styles.active : ''
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
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
