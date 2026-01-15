/**
 * DateDialog - Preact component for date extraction and truncation
 */

import { useComputed, useSignalEffect } from '@preact/signals';
import styles from './TransformDialog.module.css';
import { DialogStore } from '../stores/DialogStore';
import * as DateHandlers from '../handlers/date-handlers';

export type DateOperation = 'extract' | 'truncate';

export function DateDialog() {
  const state = DialogStore.dateState;
  const { column, operation, extractParts, truncateUnits, outputColumn, error } = state;

  const dateColumns = DateHandlers.getDateColumns();

  useSignalEffect(() => {
    void column.value;
    void operation.value;
    void extractParts.value;
    void truncateUnits.value;
    void outputColumn.value;
    DateHandlers.updateDatePreview();
  });

  const activeSelectionCount = useComputed(() => {
    return operation.value === 'extract' ? extractParts.value.length : truncateUnits.value.length;
  });

  const placeholderText = useComputed(() => {
    return DateHandlers.getDateOutputPlaceholder();
  });

  return (
    <div>
      {/* Source Column */}
      <div class={styles.group}>
        <label class={styles.label}>Source column:</label>
        <div class={styles.chipGrid2}>
          {dateColumns.map((col) => (
            <button
              key={col}
              type="button"
              class={`${styles.chip} ${column.value === col ? styles.active : ''}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
              onClick={() => (column.value = col)}
            >
              <span class={`iconify ${styles.chipIcon}`} data-icon="carbon:calendar" />
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'left',
                  flexGrow: 1,
                }}
              >
                {col}
              </span>
            </button>
          ))}
        </div>
        {dateColumns.length === 0 && (
          <div
            style={{
              color: 'var(--color-dark-gray)',
              fontSize: '0.8rem',
              marginTop: '0.5rem',
              fontStyle: 'italic',
            }}
          >
            No date/datetime columns found. Use the column type menu to set a column as date.
          </div>
        )}
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

          {/* Extract Options */}
          {operation.value === 'extract' && (
            <div class={styles.group}>
              <label class={styles.label}>Extract:</label>
              <div class={styles.chipGrid3}>
                {DateHandlers.getExtractParts().map((part) => (
                  <button
                    key={part.value}
                    type="button"
                    class={`${styles.chip} ${extractParts.value.includes(part.value) ? styles.active : ''}`}
                    onClick={(e) =>
                      DateHandlers.toggleDateSelection(part.value, e as unknown as MouseEvent)
                    }
                  >
                    <span>{part.label}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-dark-gray)' }}>
                      {part.example}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Truncate Options */}
          {operation.value === 'truncate' && (
            <div class={styles.group}>
              <label class={styles.label}>Truncate to:</label>
              <div class={styles.chipGrid3}>
                {DateHandlers.getTruncateUnits().map((unit) => (
                  <button
                    key={unit.value}
                    type="button"
                    class={`${styles.chip} ${truncateUnits.value.includes(unit.value) ? styles.active : ''}`}
                    onClick={(e) =>
                      DateHandlers.toggleDateSelection(unit.value, e as unknown as MouseEvent)
                    }
                  >
                    <span>{unit.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Output Column Name */}
          <div class={styles.group}>
            <label
              class={styles.label}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Output column name:</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-medium-gray)',
                  fontWeight: 'normal',
                }}
              >
                Tip: Cmd + Click to select multiple
              </span>
            </label>
            {activeSelectionCount.value === 1 ? (
              <input
                type="text"
                class={styles.input}
                value={outputColumn.value}
                onInput={(e) => (outputColumn.value = (e.target as HTMLInputElement).value)}
                placeholder={placeholderText.value}
              />
            ) : (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-medium-gray)',
                  padding: '0.5rem',
                  background: 'var(--color-soft-bg)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px dashed var(--border-color)',
                }}
              >
                Multiple columns will be auto-named (e.g. <span>{placeholderText.value}</span>)
              </div>
            )}
          </div>
        </>
      )}

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}

      {/* Help Section */}
      {column.value && (
        <div class={styles.expressionHelp}>
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
              Rounds down a date/datetime to the start of the specified period. Useful for bucketing
              data (e.g., grouping timestamps into daily or monthly buckets).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
