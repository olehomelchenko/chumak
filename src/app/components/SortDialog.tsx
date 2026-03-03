import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import type { SortField } from '../stores/dialogs/transform/sort-state';
import styles from './TransformDialog.module.css';

export function SortDialog() {
  const { t } = useTranslation('dialogs');
  const { fields } = DialogStore.sortState;
  const columns = AppStore.columns.value;

  const updateField = (index: number, updates: Partial<SortField>) => {
    const next = fields.value.map((f, i) => (i === index ? { ...f, ...updates } : f));
    fields.value = next;
  };

  const addLevel = () => {
    fields.value = [...fields.value, { field: '', order: 'asc' }];
  };

  const removeLevel = (index: number) => {
    fields.value = fields.value.filter((_, i) => i !== index);
  };

  return (
    <div>
      {fields.value.map((sortField, index) => (
        <div
          key={index}
          class={styles.group}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <select
            class={styles.input}
            style={{ flex: 1 }}
            value={sortField.field}
            onChange={(e) => updateField(index, { field: (e.target as HTMLSelectElement).value })}
          >
            <option value="">{t('common.placeholders.selectColumn')}</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

          <button
            type="button"
            class={`button button--small ${sortField.order === 'asc' ? 'button--active' : 'button--ghost'}`}
            onClick={() =>
              updateField(index, { order: sortField.order === 'asc' ? 'desc' : 'asc' })
            }
            title={
              sortField.order === 'asc'
                ? t('common.sortOrder.ascending')
                : t('common.sortOrder.descending')
            }
            style={{ minWidth: '32px', padding: '4px 8px', fontSize: '13px' }}
          >
            {sortField.order === 'asc'
              ? `\u2191 ${t('common.sortOrder.asc')}`
              : `\u2193 ${t('common.sortOrder.desc')}`}
          </button>

          {fields.value.length > 1 && (
            <button
              type="button"
              class="button button--small button--ghost"
              onClick={() => removeLevel(index)}
              title={t('common.buttons.removeSortLevel')}
              style={{
                minWidth: '24px',
                padding: '4px 6px',
                fontSize: '13px',
                color: 'var(--color-dark-red)',
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {fields.value.length < 5 && (
        <div class={styles.group}>
          <button
            type="button"
            class="button button--small button--ghost"
            onClick={addLevel}
            style={{ fontSize: '12px' }}
          >
            + {t('common.buttons.addSortLevel')}
          </button>
        </div>
      )}

      {fields.value.length > 1 && <p class={styles.helpText}>{t('sort.helpText')}</p>}
    </div>
  );
}
