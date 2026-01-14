/**
 * DateDialog - Preact component for date extraction and truncation
 */

import { Signal, useComputed } from '@preact/signals';

export type DateOperation = 'extract' | 'truncate';

export interface DateDialogProps {
  dateColumns: string[];
  column: Signal<string>;
  operation: Signal<DateOperation>;
  extractParts: Signal<string[]>;
  truncateUnits: Signal<string[]>;
  outputColumn: Signal<string>;
  error: Signal<string | null>;
}

const EXTRACT_OPTIONS = [
  { value: 'year', label: 'Year', example: '2024' },
  { value: 'month', label: 'Month', example: '1-12' },
  { value: 'day', label: 'Day', example: '1-31' },
  { value: 'quarter', label: 'Quarter', example: '1-4' },
  { value: 'week', label: 'Week', example: '1-53' },
  { value: 'weekday', label: 'Weekday', example: '0-6' },
  { value: 'hour', label: 'Hour', example: '0-23' },
  { value: 'minute', label: 'Minute', example: '0-59' },
  { value: 'second', label: 'Second', example: '0-59' },
];

const TRUNCATE_OPTIONS = [
  { value: 'year', label: 'Year' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'hour', label: 'Hour' },
  { value: 'minute', label: 'Minute' },
  { value: 'second', label: 'Second' },
];

export function DateDialog({
  dateColumns,
  column,
  operation,
  extractParts,
  truncateUnits,
  outputColumn,
  error,
}: DateDialogProps) {
  const handleSelection = (value: string, currentSelection: Signal<string[]>, metaKey: boolean) => {
    const current = [...currentSelection.value];
    if (metaKey) {
      if (current.includes(value)) {
        if (current.length > 1) {
          currentSelection.value = current.filter((v) => v !== value);
        }
      } else {
        currentSelection.value = [...current, value];
      }
    } else {
      currentSelection.value = [value];
    }
  };

  const activeSelectionCount = useComputed(() => {
    return operation.value === 'extract' ? extractParts.value.length : truncateUnits.value.length;
  });

  const placeholderText = useComputed(() => {
    if (!column.value) return '';
    if (operation.value === 'extract') {
      if (extractParts.value.length > 1) return '(Multiple columns)';
      return `${column.value}_${extractParts.value[0] || ''}`;
    } else {
      if (truncateUnits.value.length > 1) return '(Multiple columns)';
      return `${column.value}_${truncateUnits.value[0] || ''}_trunc`;
    }
  });

  return (
    <div class="dialog-content">
      {/* Source Column */}
      <div class="form-group">
        <label class="form-label">Source column:</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.375rem',
            maxHeight: '120px',
            overflowY: 'auto',
            padding: '2px',
          }}
        >
          {dateColumns.map((col) => (
            <button
              key={col}
              type="button"
              class={`form-chip ${column.value === col ? 'active' : ''}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
              onClick={() => (column.value = col)}
            >
              <span
                class="iconify"
                data-icon="carbon:calendar"
                style={{ fontSize: '1rem', flexShrink: 0 }}
              />
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
          <div class="form-group">
            <label class="form-label">Operation:</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                class={`form-toggle-button ${operation.value === 'extract' ? 'active' : ''}`}
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
                class={`form-toggle-button ${operation.value === 'truncate' ? 'active' : ''}`}
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
            <div class="form-group">
              <label class="form-label">Extract:</label>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}
              >
                {EXTRACT_OPTIONS.map((part) => (
                  <button
                    key={part.value}
                    type="button"
                    class={`form-chip ${extractParts.value.includes(part.value) ? 'active' : ''}`}
                    onClick={(e) =>
                      handleSelection(part.value, extractParts, e.metaKey || e.ctrlKey)
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
            <div class="form-group">
              <label class="form-label">Truncate to:</label>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}
              >
                {TRUNCATE_OPTIONS.map((unit) => (
                  <button
                    key={unit.value}
                    type="button"
                    class={`form-chip ${truncateUnits.value.includes(unit.value) ? 'active' : ''}`}
                    onClick={(e) =>
                      handleSelection(unit.value, truncateUnits, e.metaKey || e.ctrlKey)
                    }
                  >
                    <span>{unit.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Output Column Name */}
          <div class="form-group">
            <label
              class="form-label"
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
                class="form-input"
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
      {error.value && (
        <div
          style={{
            color: 'var(--color-red)',
            fontSize: '13px',
            marginTop: '8px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          {error.value}
        </div>
      )}

      {/* Help Section */}
      {column.value && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'var(--color-soft-bg)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'var(--color-dark-gray)',
              marginBottom: '0.5rem',
            }}
          >
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
