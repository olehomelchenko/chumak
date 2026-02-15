import * as AggregateHandlers from '../handlers/transform/aggregate-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

export interface Aggregation {
  col: string;
  func: string;
  output: string;
}

export function AggregateDialog() {
  const { groupBy, aggregations, isPreviewing } = DialogStore.aggregateState;
  const columns = AppStore.columns.value;

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
        <ColumnSelector
          columns={columns}
          selectedColumns={groupBy.value}
          onSelectionChange={(selected) => (groupBy.value = selected as string[])}
          mode="multi"
          display="chip"
          allowSelectAll={true}
          label="Group By (Columns)"
          helpText="Selected columns will define the grouping keys."
        />
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

      {/* Inline Help */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>How it works</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-dark-gray)', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            <strong>Group By</strong> columns define the groups — rows with the same values are
            combined. <strong>Aggregations</strong> compute a summary value for each group.
          </p>
          <div class={styles.exampleGrid}>
            <div>
              <code class={styles.exampleCode}>count</code>
            </div>
            <div class={styles.exampleDescription}>Number of rows</div>
            <div>
              <code class={styles.exampleCode}>sum</code>
            </div>
            <div class={styles.exampleDescription}>Total of numeric values</div>
            <div>
              <code class={styles.exampleCode}>mean</code>
            </div>
            <div class={styles.exampleDescription}>Average value</div>
            <div>
              <code class={styles.exampleCode}>median</code>
            </div>
            <div class={styles.exampleDescription}>Middle value</div>
            <div>
              <code class={styles.exampleCode}>min / max</code>
            </div>
            <div class={styles.exampleDescription}>Smallest / largest value</div>
            <div>
              <code class={styles.exampleCode}>distinct</code>
            </div>
            <div class={styles.exampleDescription}>Count of unique values</div>
            <div>
              <code class={styles.exampleCode}>stdev</code>
            </div>
            <div class={styles.exampleDescription}>Standard deviation</div>
          </div>
        </div>
      </div>

      {/* Preview Button */}
      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          class="button button--secondary"
          onClick={AggregateHandlers.updateAggregatePreview}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Result'}
        </button>
      </div>
    </div>
  );
}
