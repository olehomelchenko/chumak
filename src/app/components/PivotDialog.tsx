import { useComputed } from '@preact/signals';
import * as PivotHandlers from '../handlers/transform/pivot-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';
import type { PivotAggregation } from '../../types/modes';

// Re-export for backward compatibility
export type { PivotAggregation } from '../../types/modes';

export function PivotDialog() {
  const {
    rowColumns,
    columnColumn,
    valueColumn,
    aggregation,
    uniqueValueCount,
    options,
    isPreviewing,
  } = DialogStore.pivotState;
  const columns = AppStore.columns.value;

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
    <div>
      {/* Inline Help */}
      <div class={styles.expressionHelp} style={{ marginBottom: '1rem' }}>
        <div class={styles.expressionHelpTitle}>
          <span>How Pivot works</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-dark-gray)', lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>
            Pivot transforms long data into wide format. Unique values from the{' '}
            <strong>Columns</strong> field become new column headers, and cells are filled with the
            aggregated <strong>Values</strong>.
          </p>
          <div
            class={styles.exampleGrid}
            style={{ marginTop: '0.5rem', fontFamily: 'var(--font-family)' }}
          >
            <div>
              <strong>Before:</strong> Name, Subject, Score
            </div>
            <div>
              <strong>After:</strong> Name, Math, Science, ...
            </div>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontStyle: 'italic', fontSize: '0.7rem' }}>
            Use <strong>Rows</strong> for grouping, <strong>Columns</strong> for new headers,
            <strong> Values</strong> for cell data. Use Unpivot (Fold) to reverse.
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {/* Row Columns */}
        <div class={styles.group}>
          <ColumnSelector
            columns={columns}
            selectedColumns={rowColumns.value}
            onSelectionChange={(selected) => (rowColumns.value = selected as string[])}
            mode="multi"
            display="chip"
            allowSelectAll={true}
            disabledColumns={[columnColumn.value, valueColumn.value].filter(Boolean)}
            maxHeight={200}
            label="Rows"
            helpText="Group by these columns"
          />
        </div>

        {/* Columns & Values */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Column Column */}
          <div class={styles.group}>
            <label class={styles.label}>Columns</label>
            <select
              class={styles.input}
              value={columnColumn.value}
              onChange={(e) => {
                columnColumn.value = (e.currentTarget as HTMLSelectElement).value;
                PivotHandlers.onPivotConfigChange();
              }}
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
                  background: 'var(--color-soft-bg)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <strong>{uniqueValueCount.value}</strong> unique values
                {uniqueValueCount.value > 50 && (
                  <span style={{ color: 'var(--color-red)' }}> (many columns!)</span>
                )}
              </div>
            )}
            <p class={styles.helpText} style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
              Values become column headers
            </p>
          </div>

          {/* Value Column */}
          <div class={styles.group}>
            <label class={styles.label}>Values</label>
            <select
              class={styles.input}
              value={valueColumn.value}
              onChange={(e) => {
                valueColumn.value = (e.currentTarget as HTMLSelectElement).value;
                PivotHandlers.onPivotConfigChange();
              }}
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
              class={styles.input}
              value={aggregation.value}
              onChange={(e) => {
                aggregation.value = (e.currentTarget as HTMLSelectElement)
                  .value as PivotAggregation;
                PivotHandlers.onPivotConfigChange();
              }}
              disabled={!valueColumn.value}
            >
              <option value="sum">Sum</option>
              <option value="mean">Average</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="any">First value</option>
            </select>
            <p class={styles.helpText} style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
              Aggregate function for cells
            </p>
          </div>
        </div>
      </div>

      {/* Summary info */}
      {summaryText.value && <div class={styles.expressionHelp}>{summaryText.value}</div>}

      {/* Advanced Options */}
      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '0.5rem' }}>
          Advanced Options
        </summary>
        <div
          style={{
            padding: '0.75rem',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
          }}
        >
          <label class={styles.checkboxLabel} style={{ marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={options.value.sort}
              onChange={(e) => {
                options.value = { ...options.value, sort: (e.target as HTMLInputElement).checked };
              }}
            />
            <span>Sort column names alphabetically</span>
          </label>
          <div class={styles.group} style={{ marginTop: '0.5rem' }}>
            <label class={styles.label} style={{ fontSize: '0.85rem' }}>
              Limit new columns
            </label>
            <input
              type="number"
              class={styles.input}
              value={options.value.limit || ''}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                const newLimit = val ? parseInt(val) : null;
                options.value = { ...options.value, limit: newLimit };
              }}
              placeholder="No limit"
              min="1"
              style={{ width: '120px' }}
            />
            <p class={styles.helpText} style={{ fontSize: '0.75rem' }}>
              Leave empty for unlimited
            </p>
          </div>
        </div>
      </details>

      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          type="button"
          class="button button--secondary"
          onClick={PivotHandlers.previewPivot}
          disabled={isPreviewing.value || !columnColumn.value || !valueColumn.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Result'}
        </button>
      </div>
    </div>
  );
}
