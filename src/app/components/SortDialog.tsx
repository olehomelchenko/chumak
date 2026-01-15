/**
 * SortDialog - Preact component for the Sort transformation dialog
 */

import { Signal } from '@preact/signals';
import styles from './TransformDialog.module.css';

export interface SortDialogProps {
  columns: string[];
  field: Signal<string>;
  order: Signal<'asc' | 'desc'>;
}

export function SortDialog({ columns, field, order }: SortDialogProps) {
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
