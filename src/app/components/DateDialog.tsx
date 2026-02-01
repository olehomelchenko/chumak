/**
 * DateDialog - Preact component for date extraction and truncation
 */

import { useComputed, useSignalEffect } from '@preact/signals';
import styles from './TransformDialog.module.css';
import { ColumnSelector } from './column-selector';
import { DialogStore } from '../stores/DialogStore';
import * as DateHandlers from '../handlers/transform/date-handlers';

export type DateOperation = 'extract' | 'truncate';

export function DateDialog() {
  const state = DialogStore.dateState;
  const { column, operation, extractParts, truncateUnits, removeOrigin, error } = state;

  const dateColumns = DateHandlers.getDateColumns();

  // Update preview when selections change - show both extract and truncate
  useSignalEffect(() => {
    void extractParts.value;
    void truncateUnits.value;
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
          label="Source column:"
          helpText={
            dateColumns.length === 0
              ? 'No date/datetime columns found. Use the column type menu to set a column as date.'
              : undefined
          }
        />
      </div>

      {column.value && (
        <>
          {/* Operation Toggle */}
          <div class={styles.group}>
            <label class={styles.label}>Operation:</label>
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
                Extract Part
              </button>
              <button
                type="button"
                class={`${styles.toggleButton} ${operation.value === 'truncate' ? styles.active : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => (operation.value = 'truncate')}
              >
                <span class="iconify" data-icon="carbon:cut-out" style={{ fontSize: '1rem' }} />
                Truncate
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div class={styles.expressionHelp} style={{ marginBottom: '1rem' }}>
            <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
              {operation.value === 'extract' ? 'Extract' : 'Truncate'}
              {' — What it does'}
            </div>
            {operation.value === 'extract' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                Extracts a numeric part from a date/datetime value. Useful for grouping or analyzing
                data by time periods (e.g., sales by month, events by weekday).
              </div>
            )}
            {operation.value === 'truncate' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                Rounds down a date/datetime to the start of the specified period. Useful for
                bucketing data (e.g., grouping timestamps into daily or monthly buckets).
              </div>
            )}
          </div>

          {/* Extract Options - shown when extract mode */}
          {operation.value === 'extract' && (
            <div class={styles.group}>
              <label class={styles.label}>Extract:</label>
              <table class={styles.dateOptionsTable}>
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>Part</th>
                    <th style={{ width: '40%' }}>Preview</th>
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
                              {part.label}
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
              <label class={styles.label}>Truncate to:</label>
              <table class={styles.dateOptionsTable}>
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>Unit</th>
                    <th style={{ width: '40%' }}>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {DateHandlers.getTruncateUnits().map((unit) => {
                    const isSelected = truncateUnits.value.includes(unit.value);
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
                              {unit.label}
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
                <span>Remove origin column after transformation</span>
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
