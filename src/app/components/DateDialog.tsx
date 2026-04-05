/**
 * DateDialog - Preact component for date extraction and truncation
 */

import { signal, useComputed, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import formStyles from './form-controls.module.css';
import colStyles from './column-editor.module.css';
import exprStyles from './expression-help.module.css';
import dateStyles from './DateDialog.module.css';
const styles = { ...formStyles, ...colStyles, ...exprStyles, ...dateStyles };
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import {
  getDateColumns,
  getExtractParts,
  getTruncateUnits,
  getDatePartPreview,
  computeDatePreview,
} from '../handlers/transform/date-handlers';
import { clearPreview } from '../handlers/preview-engine';
import { ColumnSelector } from './column-selector';
import type { DateOperation } from '../../types/modes';

export function DateDialog() {
  const { t } = useTranslation('dialogs');

  const dateColumns = getDateColumns();

  const { state } = useDialogState(
    () => {
      // Date dialog never edits existing steps (it creates derive steps)
      const quickColumn = AppStore.selectedColumn.value;
      const initialColumn =
        quickColumn && dateColumns.includes(quickColumn) ? quickColumn : dateColumns[0] || '';

      return {
        column: signal(initialColumn),
        operation: signal<DateOperation>('extract'),
        extractParts: signal<string[]>([]),
        truncateUnits: signal<string[]>([]),
        truncateIntervals: signal<Record<string, number>>({}),
        removeOrigin: signal(false),
        error: signal<string | null>(null),
      };
    },
    {
      hasError: (s) => !!s.error.value,
      getError: (s) => s.error.value,
      getState: (s) => ({
        column: s.column.value,
        operation: s.operation.value,
        extractParts: s.extractParts.value,
        truncateUnits: s.truncateUnits.value,
        truncateIntervals: s.truncateIntervals.value,
        removeOrigin: s.removeOrigin.value,
      }),
    }
  );

  const { column, operation, extractParts, truncateUnits, truncateIntervals, removeOrigin, error } =
    state;

  // Update preview when selections change
  useSignalEffect(() => {
    void extractParts.value;
    void truncateUnits.value;
    void truncateIntervals.value;
    if ((extractParts.value.length > 0 || truncateUnits.value.length > 0) && column.value) {
      // Preview is handled by useTransformPreview below
    } else {
      clearPreview();
    }
  });

  useTransformPreview({
    deps: () => {
      column.value;
      extractParts.value;
      truncateUnits.value;
      truncateIntervals.value;
    },
    compute: () => {
      return computeDatePreview(
        column.value,
        extractParts.value,
        truncateUnits.value,
        truncateIntervals.value
      );
    },
  });

  const totalSelectionCount = useComputed(() => {
    return extractParts.value.length + truncateUnits.value.length;
  });

  const toggleExtractSelection = (value: string) => {
    const current = [...extractParts.value];
    if (current.includes(value)) {
      const index = current.indexOf(value);
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    extractParts.value = current;
  };

  const toggleTruncateSelection = (value: string) => {
    const current = [...truncateUnits.value];
    if (current.includes(value)) {
      const index = current.indexOf(value);
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    truncateUnits.value = current;
  };

  const setTruncateInterval = (unit: string, interval: number) => {
    const current = { ...truncateIntervals.value };
    const clamped = Math.max(1, Math.floor(interval));
    if (clamped === 1) {
      delete current[unit];
    } else {
      current[unit] = clamped;
    }
    truncateIntervals.value = current;
  };

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
                  aria-hidden="true"
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
                <span
                  class="iconify"
                  aria-hidden="true"
                  data-icon="carbon:cut-out"
                  style={{ fontSize: '1rem' }}
                />
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
                  {getExtractParts().map((part) => {
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
                              onClick={() => toggleExtractSelection(part.value)}
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
                              ? getDatePartPreview(column.value, part.value, 'extract')
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
                  {getTruncateUnits().map((unit) => {
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
                              onClick={() => toggleTruncateSelection(unit.value)}
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
                                    setTruncateInterval(unit.value, Math.min(val, unit.max));
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
                              ? getDatePartPreview(
                                  column.value,
                                  unit.value,
                                  'truncate',
                                  truncateIntervals.value
                                )
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
