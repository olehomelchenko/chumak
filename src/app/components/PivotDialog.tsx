/**
 * PivotDialog - Preact component for pivot table configuration
 */

import { Signal, useComputed } from '@preact/signals';

export type PivotAggregation = 'sum' | 'mean' | 'count' | 'min' | 'max' | 'any';

export interface PivotDialogProps {
  columns: string[];
  rowColumns: Signal<string[]>;
  columnColumn: Signal<string>;
  valueColumn: Signal<string>;
  aggregation: Signal<PivotAggregation>;
  uniqueValueCount: Signal<number>;
  sort: Signal<boolean>;
  limit: Signal<number | null>;
  isPreviewing: Signal<boolean>;
  onPreview: () => void;
}

export function PivotDialog({
  columns,
  rowColumns,
  columnColumn,
  valueColumn,
  aggregation,
  uniqueValueCount,
  sort,
  limit,
  isPreviewing,
  onPreview,
}: PivotDialogProps) {
  // Helpers for multi-select
  const toggleRowColumn = (col: string) => {
    if (rowColumns.value.includes(col)) {
      rowColumns.value = rowColumns.value.filter((c) => c !== col);
    } else {
      rowColumns.value = [...rowColumns.value, col];
    }
  };

  const selectAllRows = () => {
    // Select all valid columns (not used in col/val)
    rowColumns.value = columns.filter((c) => c !== columnColumn.value && c !== valueColumn.value);
  };

  const selectNoneRows = () => {
    rowColumns.value = [];
  };

  // Preview text computed in component to avoid complex templates
  const summaryText = useComputed(() => {
    if (!columnColumn.value || !valueColumn.value) return null;

    const grouping =
      rowColumns.value.length > 0
        ? `Grouped by ${rowColumns.value.join(', ')},`
        : 'No row grouping (single row result),';

    return (
      <div>
        <strong>Result:</strong> {grouping} with <strong>{uniqueValueCount.value}</strong> new
        columns from <em>{columnColumn.value}</em>, showing <em>{aggregation.value}</em> of{' '}
        <em>{valueColumn.value}</em>
      </div>
    );
  });

  return (
    <div class="dialog-content">
      <p class="form-help" style={{ marginBottom: '1rem' }}>
        Create a pivot table by selecting row groupings, column headers, and values to aggregate.
      </p>

      {/* Main Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {/* Row Columns */}
        <div class="form-group">
          <label class="form-label">Rows</label>
          <div
            class="form-actions"
            style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}
          >
            <button type="button" class="button button--text button--small" onClick={selectAllRows}>
              Select All
            </button>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectNoneRows}
            >
              Select None
            </button>
          </div>

          <div class="column-chips-multi" style={{ maxHeight: '200px' }}>
            {columns.map((col) => {
              const isDisabled = col === columnColumn.value || col === valueColumn.value;
              const isSelected = rowColumns.value.includes(col);
              return (
                <button
                  key={col}
                  type="button"
                  class={`form-chip ${isSelected ? 'active' : ''}`}
                  disabled={isDisabled}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'start',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    opacity: isDisabled ? 0.4 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto',
                  }}
                  onClick={() => toggleRowColumn(col)}
                >
                  <span
                    class="iconify"
                    data-icon={isSelected ? 'carbon:checkmark-filled' : 'carbon:checkbox'}
                    style={{
                      fontSize: '1rem',
                      flexShrink: 0,
                      color: isSelected ? 'var(--color-green)' : '',
                    }}
                  />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexGrow: 1,
                      textAlign: 'left',
                    }}
                  >
                    {col}
                  </span>
                </button>
              );
            })}
          </div>
          <p class="form-help" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
            Group by these columns
          </p>
        </div>

        {/* Columns & Values */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Column Column */}
          <div class="form-group">
            <label class="form-label">Columns</label>
            <select
              class="form-input"
              value={columnColumn.value}
              onChange={(e) => (columnColumn.value = (e.target as HTMLSelectElement).value)}
              style={{ marginBottom: '0.5rem' }}
            >
              <option value="">Select column...</option>
              {columns.map((col) => (
                <option
                  key={col}
                  value={col}
                  disabled={rowColumns.value.includes(col) || valueColumn.value === col}
                >
                  {col}
                </option>
              ))}
            </select>
            {columnColumn.value && (
              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  background: 'var(--color-light-gray)',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                }}
              >
                <strong>{uniqueValueCount.value}</strong> unique values
                {uniqueValueCount.value > 50 && (
                  <span style={{ color: 'var(--color-warning)' }}> (many columns!)</span>
                )}
              </div>
            )}
            <p class="form-help" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
              Values become column headers
            </p>
          </div>

          {/* Value Column */}
          <div class="form-group">
            <label class="form-label">Values</label>
            <select
              class="form-input"
              value={valueColumn.value}
              onChange={(e) => (valueColumn.value = (e.target as HTMLSelectElement).value)}
              style={{ marginBottom: '0.5rem' }}
            >
              <option value="">Select column...</option>
              {columns.map((col) => (
                <option
                  key={col}
                  value={col}
                  disabled={rowColumns.value.includes(col) || columnColumn.value === col}
                >
                  {col}
                </option>
              ))}
            </select>
            <select
              class="form-input"
              value={aggregation.value}
              onChange={(e) =>
                (aggregation.value = (e.target as HTMLSelectElement).value as PivotAggregation)
              }
              disabled={!valueColumn.value}
            >
              <option value="sum">Sum</option>
              <option value="mean">Average</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="any">First value</option>
            </select>
            <p class="form-help" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
              Aggregate function for cells
            </p>
          </div>
        </div>
      </div>

      {/* Summary info */}
      {summaryText.value && (
        <div
          style={{
            background: 'var(--color-light-gray)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          {summaryText.value}
        </div>
      )}

      {/* Advanced Options */}
      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '0.5rem' }}>
          Advanced Options
        </summary>
        <div
          style={{
            padding: '0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
          }}
        >
          <label class="checkbox-item" style={{ marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={sort.value}
              onChange={(e) => (sort.value = (e.target as HTMLInputElement).checked)}
            />
            <span>Sort column names alphabetically</span>
          </label>
          <div class="form-group" style={{ marginTop: '0.5rem' }}>
            <label class="form-label" style={{ fontSize: '0.85rem' }}>
              Limit new columns
            </label>
            <input
              type="number"
              class="form-input"
              value={limit.value || ''}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                limit.value = val ? parseInt(val) : null;
              }}
              placeholder="No limit"
              min="1"
              style={{ width: '120px' }}
            />
            <p class="form-help" style={{ fontSize: '0.75rem' }}>
              Leave empty for unlimited
            </p>
          </div>
        </div>
      </details>

      {/* Preview Button */}
      <div class="form-group" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          class="button button--secondary"
          onClick={onPreview}
          disabled={isPreviewing.value || !columnColumn.value || !valueColumn.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Result'}
        </button>
      </div>
    </div>
  );
}
