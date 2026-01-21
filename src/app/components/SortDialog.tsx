import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

export function SortDialog() {
  const { field, order } = DialogStore.sortState;
  const columns = AppStore.columns.value;
  return (
    <div>
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={field.value}
          onSelectionChange={(col) => (field.value = col as string)}
          mode="single"
          display="chip"
          label="Sort by:"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Order:</label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              name="sort-order"
              checked={order.value === 'asc'}
              onChange={() => (order.value = 'asc')}
            />
            <span>Ascending</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              name="sort-order"
              checked={order.value === 'desc'}
              onChange={() => (order.value = 'desc')}
            />
            <span>Descending</span>
          </label>
        </div>
      </div>
    </div>
  );
}
