import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import tableStyles from './DataTable.module.css';
import styles from './TablePreviewModal.module.css';

export function TablePreviewModal() {
  const previewTableId = DialogStore.joinState.previewTableId.value;
  const previewMismatchValues = DialogStore.joinState.previewMismatchValues.value;

  // Handle mismatch values preview
  if (previewMismatchValues) {
    const { values, column, side } = previewMismatchValues;
    const title = `${side === 'left' ? 'Left' : 'Right'} only values (${column})`;

    const handleClose = () => {
      DialogStore.joinState.previewMismatchValues.value = null;
    };

    return (
      <div class={styles.backdrop} onClick={handleClose}>
        <div
          class={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-mismatch-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div class={styles.header}>
            <h3 id="preview-mismatch-title">{title}</h3>
            <button class={styles.closeButton} onClick={handleClose} aria-label="Close">
              ×
            </button>
          </div>
          <div class={styles.content}>
            <div class={styles.stats}>
              {values.length} unique value{values.length !== 1 ? 's' : ''}
            </div>
            <div class={tableStyles.tableContainer}>
              <table class={tableStyles.dataTable}>
                <thead>
                  <tr>
                    <th class={tableStyles.dataTable__header}>{column}</th>
                  </tr>
                </thead>
                <tbody>
                  {values.slice(0, 500).map((value, idx) => (
                    <tr key={idx} class={tableStyles.dataTable__row}>
                      <td class={tableStyles.cell}>{String(value ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {values.length > 500 && (
                <div class={styles.footerNote}>
                  Showing first 500 of {values.length} unique values
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle table preview
  if (!previewTableId) return null;

  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  // Get data for the preview
  let data: any[] = [];
  let columns: string[] = [];
  let title = '';

  const model = models.find((m) => m.id === previewTableId);
  if (model) {
    title = model.name;
    if (model.steps.length > 0) {
      try {
        const result = StepService.computeModelUpToStep(model, model.steps.length - 1, {
          sources,
          models,
        });
        data = result.data;
        columns = result.columns;
      } catch (error) {
        console.error('Error computing model:', error);
        data = model.data || [];
        columns = model.schema?.map((c) => c.name) || [];
      }
    } else {
      data = model.data || [];
      columns = model.schema?.map((c) => c.name) || [];
    }
  } else {
    const source = sources.find((s) => s.id === previewTableId);
    if (source) {
      title = source.name;
      data = source.data || [];
      columns = source.columns?.map((c: any) => c.name) || [];
    }
  }

  const handleClose = () => {
    DialogStore.joinState.previewTableId.value = null;
  };

  return (
    <div class={styles.backdrop} onClick={handleClose}>
      <div
        class={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-table-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div class={styles.header}>
          <h3 id="preview-table-title">{title}</h3>
          <button class={styles.closeButton} onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>
        <div class={styles.content}>
          <div class={styles.stats}>
            {data.length} rows, {columns.length} columns
          </div>
          <div class={tableStyles.tableContainer}>
            <table class={tableStyles.dataTable}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} class={tableStyles.dataTable__header}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, idx) => (
                  <tr key={idx} class={tableStyles.dataTable__row}>
                    {columns.map((col) => (
                      <td key={col} class={tableStyles.cell}>
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 100 && (
              <div class={styles.footerNote}>Showing first 100 of {data.length} rows</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
