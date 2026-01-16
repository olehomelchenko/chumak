import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';

interface CellToolbarProps {
  onFilter: (op: 'exact' | 'not' | 'gt' | 'gte' | 'lt' | 'lte') => void;
  onReplace: () => void;
}

export function CellToolbar({ onFilter, onReplace }: CellToolbarProps) {
  const selectedCell = AppStore.selectedCell.value;
  const pos = AppStore.cellToolbarPos.value;

  if (!selectedCell || selectedCell.isEda) return null;

  const { type } = selectedCell;
  const isComparable = ['number', 'integer', 'float', 'date', 'datetime'].includes(type);

  return (
    <div
      class={styles.floatingToolbar}
      style={
        {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          '--arrow-offset': `${pos.arrowOffset}px`,
        } as any
      }
      onClick={(e) => e.stopPropagation()}
    >
      <button
        class={styles.floatingToolbar__button}
        onClick={() => onFilter('exact')}
        title={isComparable ? 'Keep only this value (=)' : 'Keep only this value'}
      >
        <span class="iconify" data-icon="carbon:filter" style="width: 24px; height: 24px;"></span>
        {isComparable && <span class={styles.floatingToolbar__operatorLabel}>=</span>}
      </button>

      <button
        class={`${styles.floatingToolbar__button} ${styles.danger}`}
        onClick={() => onFilter('not')}
        title={isComparable ? 'Exclude this value (≠)' : 'Exclude this value'}
      >
        <span
          class="iconify"
          data-icon="carbon:filter-remove"
          style="width: 24px; height: 24px;"
        ></span>
      </button>

      <div class={styles.floatingToolbar__divider}></div>

      <button class={styles.floatingToolbar__button} onClick={onReplace} title="Replace this value">
        <span class="iconify" data-icon="codicon:replace" style="width: 24px; height: 24px;"></span>
      </button>

      {isComparable && (
        <div class={styles.floatingToolbar__comparableGroup}>
          <div class={styles.floatingToolbar__divider}></div>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('gt')}
            title={
              type.includes('date') ? 'Keep values after this date' : 'Keep values greater than (>)'
            }
          >
            <span class={styles.floatingToolbar__textOp}>&gt;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('gte')}
            title={
              type.includes('date')
                ? 'Keep values on or after this date'
                : 'Keep values greater than or equal (≥)'
            }
          >
            <span class={styles.floatingToolbar__textOp}>&ge;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('lt')}
            title={
              type.includes('date') ? 'Keep values before this date' : 'Keep values less than (<)'
            }
          >
            <span class={styles.floatingToolbar__textOp}>&lt;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('lte')}
            title={
              type.includes('date')
                ? 'Keep values on or before this date'
                : 'Keep values less than or equal (≤)'
            }
          >
            <span class={styles.floatingToolbar__textOp}>&le;</span>
          </button>
        </div>
      )}
    </div>
  );
}
