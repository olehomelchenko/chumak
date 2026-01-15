/**
 * ReplaceDialog - Preact component for the Replace Values dialog
 */

import { Signal } from '@preact/signals';
import styles from './TransformDialog.module.css';

export interface ReplaceDialogProps {
  columns: string[];
  column: Signal<string>;
  findValue: Signal<string>;
  replaceValue: Signal<string>;
}

export function ReplaceDialog({ columns, column, findValue, replaceValue }: ReplaceDialogProps) {
  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>Column:</label>
        <div class={styles.chipGrid}>
          {columns.map((col) => (
            <button
              key={col}
              type="button"
              class={`${styles.chip} ${column.value === col ? styles.active : ''}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
              onClick={() => (column.value = col)}
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
        <label class={styles.label}>Find value:</label>
        <input
          type="text"
          class={styles.input}
          value={findValue.value}
          onInput={(e) => (findValue.value = (e.target as HTMLInputElement).value)}
          placeholder="Value to replace"
        />
        <p class={styles.helpText}>The exact value to find and replace</p>
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Replace with:</label>
        <input
          type="text"
          class={styles.input}
          value={replaceValue.value}
          onInput={(e) => (replaceValue.value = (e.target as HTMLInputElement).value)}
          placeholder="New value (leave empty for null)"
        />
        <p class={styles.helpText}>New value to use (leave empty to replace with null)</p>
      </div>
    </div>
  );
}
