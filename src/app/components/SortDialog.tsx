import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

export function SortDialog() {
  const { field, order } = DialogStore.sortState;
  const columns = AppStore.columns.value;
  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>Sort by:</label>
        <div class={styles.chipGrid}>
          {columns.map((col) => (
            <button
              key={col}
              type="button"
              class={`${styles.chip} ${field.value === col ? styles.active : ''}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
              onClick={() => (field.value = col)}
            >
              <span class={`iconify ${styles.chipIcon}`} data-icon="carbon:column" />
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
