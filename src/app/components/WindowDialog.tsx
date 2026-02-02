import * as WindowHandlers from '../handlers/transform/window-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';
import type { WindowFunction, OrderByItem } from '../stores/dialogs/aggregate/window-state';

/** Window functions that require a source column */
const COLUMN_REQUIRED_FUNCTIONS = [
  'lag',
  'lead',
  'first_value',
  'last_value',
  'nth_value',
  'fill_down',
  'fill_up',
];

/** Window functions that use the offset parameter */
const OFFSET_FUNCTIONS = ['lag', 'lead', 'ntile', 'nth_value'];

/** Window functions that can have a default value */
const DEFAULT_VALUE_FUNCTIONS = ['lag', 'lead'];

const WINDOW_FUNCTIONS = [
  { value: 'row_number', label: 'Row Number', description: 'Sequential row numbers' },
  { value: 'rank', label: 'Rank', description: 'Rank with gaps for ties' },
  { value: 'dense_rank', label: 'Dense Rank', description: 'Rank without gaps' },
  { value: 'lag', label: 'Lag', description: 'Previous row value' },
  { value: 'lead', label: 'Lead', description: 'Next row value' },
  { value: 'first_value', label: 'First Value', description: 'First value in partition' },
  { value: 'last_value', label: 'Last Value', description: 'Last value in partition' },
  { value: 'percent_rank', label: 'Percent Rank', description: 'Percentage rank (0-1)' },
  { value: 'ntile', label: 'N-Tile', description: 'Distribute into N buckets' },
  { value: 'fill_down', label: 'Fill Down', description: 'Fill nulls with preceding value' },
  { value: 'fill_up', label: 'Fill Up', description: 'Fill nulls with following value' },
];

export function WindowDialog() {
  const { orderBy, partitionBy, windowFunctions, isPreviewing } = DialogStore.windowState;
  const columns = AppStore.columns.value;

  const updateOrderBy = (index: number, field: keyof OrderByItem, value: string) => {
    const newOrderBy = [...orderBy.value];
    newOrderBy[index] = { ...newOrderBy[index], [field]: value };
    orderBy.value = newOrderBy;
  };

  const removeOrderBy = (index: number) => {
    orderBy.value = orderBy.value.filter((_, i) => i !== index);
  };

  const addOrderBy = () => {
    orderBy.value = [...orderBy.value, { field: '', order: 'asc' }];
  };

  const updateWindowFunction = (index: number, field: keyof WindowFunction, value: any) => {
    const newFuncs = [...windowFunctions.value];
    newFuncs[index] = { ...newFuncs[index], [field]: value };

    // Auto-generate output name when function or column changes
    if (field === 'func' || field === 'sourceCol') {
      const wf = newFuncs[index];
      if (!wf.output || wf.output.startsWith('window_')) {
        const funcName = wf.func;
        const colPart = wf.sourceCol ? `_${wf.sourceCol}` : '';
        newFuncs[index].output = `${funcName}${colPart}`;
      }
    }

    windowFunctions.value = newFuncs;
  };

  const removeWindowFunction = (index: number) => {
    windowFunctions.value = windowFunctions.value.filter((_, i) => i !== index);
  };

  const addWindowFunction = () => {
    windowFunctions.value = [
      ...windowFunctions.value,
      { func: 'row_number', sourceCol: '', offset: 1, defaultValue: '', output: '' },
    ];
  };

  return (
    <div>
      {/* Order By Section */}
      <div class={styles.group}>
        <label class={styles.label}>Order By</label>
        <p class={styles.helpText}>
          Required for meaningful window results. Determines row order for lag/lead/rank.
        </p>

        <div style={{ marginBottom: '0.5rem' }}>
          {orderBy.value.map((item, index) => (
            <div key={index} class={styles.aggregationRow}>
              <select
                class={styles.input}
                style={{ flex: 2 }}
                value={item.field}
                onChange={(e) =>
                  updateOrderBy(index, 'field', (e.target as HTMLSelectElement).value)
                }
              >
                <option value="">Select column...</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              <select
                class={styles.input}
                style={{ width: '120px' }}
                value={item.order}
                onChange={(e) =>
                  updateOrderBy(index, 'order', (e.target as HTMLSelectElement).value)
                }
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>

              <button
                class="button button--secondary button--small"
                onClick={() => removeOrderBy(index)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button class="button button--secondary button--small" onClick={addOrderBy}>
          + Add Order Column
        </button>
      </div>

      {/* Partition By Section */}
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={partitionBy.value}
          onSelectionChange={(selected) => (partitionBy.value = selected as string[])}
          mode="multi"
          display="chip"
          allowSelectAll={false}
          label="Partition By (Optional)"
          helpText="Window functions will restart for each group. Leave empty for no partitioning."
        />
      </div>

      {/* Window Functions Section */}
      <div class={styles.group}>
        <label class={styles.label}>Window Functions</label>

        <div style={{ marginBottom: '0.5rem' }}>
          {windowFunctions.value.map((wf, index) => {
            const funcInfo = WINDOW_FUNCTIONS.find((f) => f.value === wf.func);
            const needsColumn = COLUMN_REQUIRED_FUNCTIONS.includes(wf.func);
            const needsOffset = OFFSET_FUNCTIONS.includes(wf.func);
            const needsDefault = DEFAULT_VALUE_FUNCTIONS.includes(wf.func);

            return (
              <div key={index} class={styles.windowRow}>
                <div class={styles.windowRowMain}>
                  {/* Function */}
                  <select
                    class={styles.input}
                    style={{ width: '140px' }}
                    value={wf.func}
                    onChange={(e) =>
                      updateWindowFunction(index, 'func', (e.target as HTMLSelectElement).value)
                    }
                    title={funcInfo?.description}
                  >
                    {WINDOW_FUNCTIONS.map((f) => (
                      <option key={f.value} value={f.value} title={f.description}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Source Column (conditional) */}
                  {needsColumn && (
                    <select
                      class={styles.input}
                      style={{ flex: 1 }}
                      value={wf.sourceCol}
                      onChange={(e) =>
                        updateWindowFunction(
                          index,
                          'sourceCol',
                          (e.target as HTMLSelectElement).value
                        )
                      }
                    >
                      <option value="">Select column...</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Offset (conditional) */}
                  {needsOffset && (
                    <input
                      type="number"
                      class={styles.input}
                      style={{ width: '60px' }}
                      value={wf.offset}
                      min={1}
                      onInput={(e) =>
                        updateWindowFunction(
                          index,
                          'offset',
                          parseInt((e.target as HTMLInputElement).value) || 1
                        )
                      }
                      title={wf.func === 'ntile' ? 'Number of buckets' : 'Offset (rows)'}
                      placeholder={wf.func === 'ntile' ? 'N' : 'Offset'}
                    />
                  )}

                  <span>&rarr;</span>

                  {/* Output Name */}
                  <input
                    type="text"
                    class={styles.input}
                    style={{ flex: 1 }}
                    value={wf.output}
                    onInput={(e) =>
                      updateWindowFunction(index, 'output', (e.target as HTMLInputElement).value)
                    }
                    placeholder="Output column name"
                  />

                  <button
                    class="button button--secondary button--small"
                    onClick={() => removeWindowFunction(index)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>

                {/* Default value row (conditional) */}
                {needsDefault && (
                  <div class={styles.windowRowExtra}>
                    <label class={styles.smallLabel}>Default value (if no prior/next row):</label>
                    <input
                      type="text"
                      class={styles.input}
                      style={{ width: '120px' }}
                      value={wf.defaultValue}
                      onInput={(e) =>
                        updateWindowFunction(
                          index,
                          'defaultValue',
                          (e.target as HTMLInputElement).value
                        )
                      }
                      placeholder="(null)"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button class="button button--secondary button--small" onClick={addWindowFunction}>
          + Add Window Function
        </button>
      </div>

      {/* Preview Button */}
      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          class="button button--secondary"
          onClick={WindowHandlers.updateWindowPreview}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Result'}
        </button>
      </div>
    </div>
  );
}
