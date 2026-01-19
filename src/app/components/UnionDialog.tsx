import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';
import tableStyles from './DataTable.module.css';
import * as UnionHandlers from '../handlers/union-handlers';

export interface JoinTarget {
  id: string;
  name: string;
  type: 'model' | 'source';
  sourceName?: string;
}

export function UnionDialog() {
  const { targetModel, targets, previewData, previewError, isPreviewing } = DialogStore.unionState;

  const handleTargetChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    targetModel.value = target.value || null;
    UnionHandlers.onUnionTargetChange();
  };

  const handlePreview = () => {
    UnionHandlers.previewUnion();
  };

  return (
    <div>
      {/* Union With */}
      <div class={styles.group}>
        <label class={styles.label} for="union-target-select">
          Union With
        </label>
        <select
          id="union-target-select"
          class={styles.input}
          value={targetModel.value || ''}
          onChange={handleTargetChange}
        >
          <option value="" disabled>
            Select model or source...
          </option>
          {targets.value.map((target) => (
            <option key={target.id} value={target.id}>
              {`${target.name} (${target.type === 'model' ? 'model' : 'source'}${
                target.sourceName ? ` - ${target.sourceName}` : ''
              })`}
            </option>
          ))}
        </select>
        {targets.value.length === 0 && (
          <div class={styles.error}>
            No other models or sources available. Create another model or import another dataset
            first.
          </div>
        )}
        <div class={styles.helpText}>
          Stacks rows from the selected model/source below current rows (removes duplicates)
        </div>
      </div>

      {/* Preview Button */}
      <div class={styles.group}>
        <button
          class="button button--secondary"
          onClick={handlePreview}
          disabled={isPreviewing.value || !targetModel.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Union'}
        </button>
      </div>

      {/* Preview Error */}
      {previewError.value && <div class={styles.error}>{previewError.value}</div>}

      {/* Preview Results */}
      {previewData.value && (
        <div class={styles.group}>
          <div class={styles.previewContainer}>
            <strong>Preview Result:</strong>
            <div>
              {`${previewData.value.totalRows || 0} rows, ${
                previewData.value.columns?.length || 0
              } columns`}
            </div>
            <div
              style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', marginTop: '0.5rem' }}
            >
              Showing first 100 rows
            </div>
          </div>

          <div class={styles.previewScroll}>
            <div class={tableStyles.tableContainer}>
              <table class={tableStyles.dataTable}>
                <thead>
                  <tr>
                    {previewData.value.columns?.map((col: string) => (
                      <th key={col} class={tableStyles.dataTable__header}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.value.rows?.map((row: any, idx: number) => (
                    <tr key={idx} class={tableStyles.dataTable__row}>
                      {previewData.value.columns?.map((col: string) => (
                        <td key={col} class={tableStyles.cell}>
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
