/**
 * TextDialog - Preact component for text operations
 */

import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
import dateStyles from './DateDialog.module.css';
const styles = { ...formStyles, ...exprStyles, ...dateStyles };
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { ColumnSelector } from './column-selector';
import {
  getTextColumns,
  getTextOperationPreview,
  computeTextPreview,
} from '../handlers/transform/text-handlers';

export function TextDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    () => ({
      column: signal(AppStore.selectedColumn.value ?? ''),
      operations: signal<string[]>([]),
      removeOrigin: signal(false),
      error: signal<string | null>(null),
    }),
    {
      hasError: (s) => !s.column.value || s.operations.value.length === 0,
      getState: (s) => ({
        column: s.column.value,
        operations: s.operations.value,
        removeOrigin: s.removeOrigin.value,
      }),
    }
  );

  const { column, operations, removeOrigin, error } = state;
  const textColumns = getTextColumns();

  useTransformPreview({
    deps: () => {
      column.value;
      operations.value;
    },
    compute: () => {
      error.value = null;
      if (!column.value || operations.value.length === 0) return null;
      return computeTextPreview(column.value, operations.value);
    },
    onError: (err) => {
      error.value = err.message;
    },
  });

  const setCaseOperation = (opValue: string | null) => {
    const caseOps = ['uppercase', 'lowercase', 'titlecase'];
    const filtered = operations.value.filter((op) => !caseOps.includes(op));
    if (opValue) filtered.push(opValue);
    operations.value = filtered;
  };

  const setTrimOperation = (enabled: boolean) => {
    const current = [...operations.value];
    if (enabled) {
      if (!current.includes('trim')) current.push('trim');
    } else {
      const index = current.indexOf('trim');
      if (index !== -1) current.splice(index, 1);
    }
    operations.value = current;
  };

  const caseOperations = [
    { value: 'uppercase', label: t('text.operations.uppercase') },
    { value: 'lowercase', label: t('text.operations.lowercase') },
    { value: 'titlecase', label: t('text.operations.titlecase') },
  ];

  return (
    <div>
      {/* Source Column */}
      <div class={styles.group}>
        <ColumnSelector
          columns={textColumns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          gridColumns={2}
          label={t('text.sourceColumnLabel')}
          helpText={textColumns.length === 0 ? t('text.noColumnsHelp') : undefined}
        />
      </div>

      {column.value && (
        <>
          {/* Case Transformation */}
          <div class={styles.group}>
            <label class={styles.label}>{t('text.caseTransformLabel')}</label>
            <table class={styles.dateOptionsTable}>
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>{t('text.operation')}</th>
                  <th style={{ width: '40%' }}>{t('text.preview')}</th>
                </tr>
              </thead>
              <tbody>
                {caseOperations.map((op) => {
                  const isSelected = operations.value.includes(op.value);
                  return (
                    <tr
                      key={op.value}
                      class={`${styles.dateOptionRow} ${!isSelected ? styles.unselected : ''}`}
                    >
                      <td>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="case-operation"
                            checked={isSelected}
                            onChange={() => setCaseOperation(op.value)}
                            style={{ margin: 0 }}
                          />
                          <span>{op.label}</span>
                        </label>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--color-dark-gray)',
                            fontFamily: 'var(--font-family-mono)',
                            opacity: !isSelected ? 0.4 : 1,
                          }}
                        >
                          {column.value ? getTextOperationPreview(op.value, column.value) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* None option */}
                <tr
                  class={`${styles.dateOptionRow} ${operations.value.some((op) => ['uppercase', 'lowercase', 'titlecase'].includes(op)) ? styles.unselected : ''}`}
                >
                  <td>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="case-operation"
                        checked={
                          !operations.value.some((op) =>
                            ['uppercase', 'lowercase', 'titlecase'].includes(op)
                          )
                        }
                        onChange={() => setCaseOperation(null)}
                        style={{ margin: 0 }}
                      />
                      <span>{t('text.operations.none')}</span>
                    </label>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-dark-gray)',
                        fontFamily: 'var(--font-family-mono)',
                        opacity: 0.4,
                      }}
                    >
                      —
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Trim Whitespace */}
          <div class={styles.group}>
            <label class={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={operations.value.includes('trim')}
                onChange={(e) => setTrimOperation((e.target as HTMLInputElement).checked)}
              />
              <span>{t('text.trimWhitespace')}</span>
            </label>
          </div>

          {/* Help Section */}
          <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
            <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
              {t('text.help.title')}
            </div>
            <div
              style={{ fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: t('text.help.description') }}
            />
          </div>

          {/* Remove Origin Column Option */}
          {operations.value.length > 0 && (
            <div class={styles.group}>
              <label class={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={removeOrigin.value}
                  onChange={(e) => (removeOrigin.value = (e.target as HTMLInputElement).checked)}
                />
                <span>{t('text.removeOrigin')}</span>
              </label>
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
