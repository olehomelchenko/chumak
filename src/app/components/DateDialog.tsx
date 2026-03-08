/**
 * DateDialog - Preact component for date extraction and truncation
 */

import { useComputed, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import formStyles from './form-controls.module.css';
import colStyles from './column-editor.module.css';
import exprStyles from './expression-help.module.css';
import dateStyles from './DateDialog.module.css';
const styles = { ...formStyles, ...colStyles, ...exprStyles, ...dateStyles };
import { ColumnSelector } from './column-selector';
import { DialogStore } from '../stores/DialogStore';
import * as DateHandlers from '../handlers/transform/date-handlers';

// Re-export for backward compatibility
export type { DateOperation } from '../../types/modes';

export function DateDialog() {
  const { t } = useTranslation('dialogs');
  const state = DialogStore.dateState;
  const { column, operation, extractParts, truncateUnits, truncateIntervals, removeOrigin, error } =
    state;

  const dateColumns = DateHandlers.getDateColumns();

  // Update preview when selections change - show both extract and truncate
  useSignalEffect(() => {
    void extractParts.value;
    void truncateUnits.value;
    void truncateIntervals.value;
    // Update if user has made any selections
    if ((extractParts.value.length > 0 || truncateUnits.value.length > 0) && column.value) {
      DateHandlers.updateDatePreview();
    } else {
      DateHandlers.clearDatePreview();
    }
  });

  const totalSelectionCount = useComputed(() => {
    return extractParts.value.length + truncateUnits.value.length;
  });

  return (
    <div>
      {/* Source Column */}
      <div class={styles.group}>
        <ColumnSelector
          columns={dateColumns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          gridColumns={2}
          label={t('date.sourceColumnLabel')}
          helpText={dateColumns.length === 0 ? t('date.noColumnsHelp') : undefined}
        />
      </div>

      {column.value && (
        <>
          {/* Operation Toggle */}
          <div class={styles.group}>
            <label class={styles.label}>{t('date.operationLabel')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                class={`${styles.toggleButton} ${operation.value === 'extract' ? styles.active : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => (operation.value = 'extract')}
              >
                <span
                  class="iconify"
                  data-icon="carbon:chart-custom"
                  style={{ fontSize: '1rem' }}
                />
                {t('date.operations.extract')}
              </button>
              <button
                type="button"
                class={`${styles.toggleButton} ${operation.value === 'truncate' ? styles.active : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => (operation.value = 'truncate')}
              >
                <span class="iconify" data-icon="carbon:cut-out" style={{ fontSize: '1rem' }} />
                {t('date.operations.truncate')}
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div class={styles.expressionHelp} style={{ marginBottom: '1rem' }}>
            <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
              {t(`date.help.${operation.value}.title`)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
              {t(`date.help.${operation.value}.description`)}
            </div>
          </div>

          {/* Extract Options - shown when extract mode */}
          {operation.value === 'extract' && (
            <div class={styles.group}>
              <label class={styles.label}>{t('date.extractLabel')}</label>
              <table class={styles.dateOptionsTable}>
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>{t('date.part')}</th>
                    <th style={{ width: '40%' }}>{t('date.preview')}</th>
                  </tr>
                </thead>
                <tbody>
                  {DateHandlers.getExtractParts().map((part) => {
                    const isSelected = extractParts.value.includes(part.value);
                    return (
                      <tr
                        key={part.value}
                        class={`${styles.dateOptionRow} ${!isSelected ? styles.unselected : ''}`}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              class={styles.itemCheckbox}
                              onClick={() => DateHandlers.toggleExtractSelection(part.value)}
                            >
                              <span
                                style={{
                                  color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                                }}
                              >
                                {isSelected ? '✓' : '✗'}
                              </span>
                            </button>
                            <span
                              style={{
                                textDecoration: !isSelected ? 'line-through' : 'none',
                                opacity: !isSelected ? 0.6 : 1,
                              }}
                            >
                              {t(`date.extractParts.${part.value}`)}
                            </span>
                          </div>
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
                            {column.value
                              ? DateHandlers.getDatePartPreview(part.value, 'extract')
                              : part.example}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Truncate Options - shown when truncate mode */}
          {operation.value === 'truncate' && (
            <div class={styles.group}>
              <label class={styles.label}>{t('date.truncateLabel')}</label>
              <table class={styles.dateOptionsTable}>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>{t('date.unit')}</th>
                    <th style={{ width: '30%' }}>{t('date.interval')}</th>
                    <th style={{ width: '35%' }}>{t('date.preview')}</th>
                  </tr>
                </thead>
                <tbody>
                  {DateHandlers.getTruncateUnits().map((unit) => {
                    const isSelected = truncateUnits.value.includes(unit.value);
                    const interval = truncateIntervals.value[unit.value] ?? 1;
                    return (
                      <tr
                        key={unit.value}
                        class={`${styles.dateOptionRow} ${!isSelected ? styles.unselected : ''}`}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              class={styles.itemCheckbox}
                              onClick={() => DateHandlers.toggleTruncateSelection(unit.value)}
                            >
                              <span
                                style={{
                                  color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                                }}
                              >
                                {isSelected ? '✓' : '✗'}
                              </span>
                            </button>
                            <span
                              style={{
                                textDecoration: !isSelected ? 'line-through' : 'none',
                                opacity: !isSelected ? 0.6 : 1,
                              }}
                            >
                              {t(`date.truncateUnits.${unit.value}`)}
                            </span>
                          </div>
                        </td>
                        <td>
                          {unit.supportsInterval ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                opacity: !isSelected ? 0.4 : 1,
                              }}
                            >
                              <span
                                style={{ fontSize: '0.75rem', color: 'var(--color-dark-gray)' }}
                              >
                                {t('date.intervalEvery')}
                              </span>
                              <input
                                type="number"
                                class={styles.input}
                                min={1}
                                max={unit.max}
                                value={interval}
                                onInput={(e) => {
                                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                                  if (!isNaN(val) && val >= 1) {
                                    DateHandlers.setTruncateInterval(
                                      unit.value,
                                      Math.min(val, unit.max)
                                    );
                                  }
                                }}
                                style={{
                                  width: '3rem',
                                  padding: '0.125rem 0.25rem',
                                  textAlign: 'center',
                                }}
                              />
                            </div>
                          ) : null}
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
                            {column.value
                              ? DateHandlers.getDatePartPreview(unit.value, 'truncate')
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Remove Origin Column Option */}
          {totalSelectionCount.value > 0 && (
            <div class={styles.group}>
              <label class={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={removeOrigin.value}
                  onChange={(e) => (removeOrigin.value = (e.target as HTMLInputElement).checked)}
                />
                <span>{t('date.removeOrigin')}</span>
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
