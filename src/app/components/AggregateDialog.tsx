import * as AggregateHandlers from '../handlers/aggregate-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

export interface Aggregation {
  col: string;
  func: string;
  output: string;
}

export function AggregateDialog() {
  const { groupBy, aggregations, isPreviewing } = DialogStore.aggregateState;
  const columns = AppStore.columns.value;

  const toggleColumn = (col: string) => {
    if (groupBy.value.includes(col)) {
      groupBy.value = groupBy.value.filter((c) => c !== col);
    } else {
      groupBy.value = [...groupBy.value, col];
    }
  };

  const selectAll = () => {
    groupBy.value = [...columns];
  };

  const selectNone = () => {
    groupBy.value = [];
  };

  const updateAggregation = (index: number, field: keyof Aggregation, value: string) => {
    const newAggs = [...aggregations.value];
    newAggs[index] = { ...newAggs[index], [field]: value };
    aggregations.value = newAggs;
    AggregateHandlers.updateAggregateOutputName(index);
  };

  const aggFunctions = [
    { value: 'count', label: 'Count' },
    { value: 'sum', label: 'Sum' },
    { value: 'mean', label: 'Mean' },
    { value: 'median', label: 'Median' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'distinct', label: 'Distinct' },
    { value: 'stdev', label: 'StDev' },
    { value: 'first', label: 'First' },
    { value: 'last', label: 'Last' },
  ];

  return (
    <div>
      {/* Group By Section */}
      <div class={styles.group}>
        <label class={styles.label}>Group By (Columns)</label>
        <div
          class={styles.actions}
          style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}
        >
          <button type="button" class="button button--text button--small" onClick={selectAll}>
            Select All
          </button>
          <button type="button" class="button button--text button--small" onClick={selectNone}>
            Select None
          </button>
        </div>

        <div class={styles.chipGrid}>
          {columns.map((col) => {
            const isSelected = groupBy.value.includes(col);
            return (
              <button
                key={col}
                type="button"
                class={`${styles.chip} ${isSelected ? styles.active : ''}`}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'start',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                }}
                onClick={() => toggleColumn(col)}
              >
                <div
                  class={`iconify ${styles.chipIcon}`}
                  style={{
                    color: isSelected ? 'var(--color-green)' : 'currentColor',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected ? '✓' : '☐'}
                </div>
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
          {columns.length === 0 && (
            <div style={{ color: '#888', fontSize: '0.8rem' }}>No columns available</div>
          )}
        </div>
        <div class={styles.helpText}>Selected columns will define the grouping keys.</div>
      </div>

      {/* Aggregations Section */}
      <div class={styles.group}>
        <label class={styles.label}>Summarize / Rollup</label>

        <div style={{ marginBottom: '0.5rem' }}>
          {aggregations.value.map((agg, index) => (
            <div key={index} class={styles.aggregationRow}>
              {/* Column */}
              <select
                class={styles.input}
                style={{ flex: 1 }}
                value={agg.col}
                onChange={(e) =>
                  updateAggregation(index, 'col', (e.target as HTMLSelectElement).value)
                }
                disabled={agg.func === 'count'}
              >
                <option value="">{agg.func === 'count' ? '(All rows)' : 'Select column...'}</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Function */}
              <select
                class={styles.input}
                style={{ width: '100px' }}
                value={agg.func}
                onChange={(e) =>
                  updateAggregation(index, 'func', (e.target as HTMLSelectElement).value)
                }
              >
                {aggFunctions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              <span>&rarr;</span>

              {/* Output Name */}
              <input
                type="text"
                class={styles.input}
                style={{ flex: 1 }}
                value={agg.output}
                onInput={(e) =>
                  updateAggregation(index, 'output', (e.target as HTMLInputElement).value)
                }
                placeholder="Output name (auto-generated)"
              />

              <button
                class="button button--secondary button--small"
                onClick={() => AggregateHandlers.removeAggregation(index)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          class="button button--secondary button--small"
          onClick={AggregateHandlers.addAggregation}
        >
          + Add Aggregation
        </button>
      </div>

      {/* Preview Button */}
      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          class="button button--secondary"
          onClick={AggregateHandlers.previewAggregate}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Result'}
        </button>
      </div>
    </div>
  );
}
