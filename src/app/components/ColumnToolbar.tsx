import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';

interface ColumnToolbarProps {
  onSort: (order: 'asc' | 'desc') => void;
  onFilter: () => void;
  onRename: () => void;
  onSplit: () => void;
  onDate: () => void;
  onDedupe: () => void;
  onRemove: () => void;
  getColumnType: (col: string) => string;
}

export function ColumnToolbar({
  onSort,
  onFilter,
  onRename,
  onSplit,
  onDate,
  onDedupe,
  onRemove,
  getColumnType,
}: ColumnToolbarProps) {
  const selectedColumn = AppStore.selectedColumn.value;
  const pos = AppStore.columnToolbarPos.value;

  if (!selectedColumn) return null;

  const type = getColumnType(selectedColumn);
  const isDate = ['date', 'datetime'].includes(type);

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
        onClick={() => onSort('asc')}
        title="Sort Ascending"
      >
        <span class="iconify" data-icon="carbon:arrow-up" style="width: 24px; height: 24px;"></span>
      </button>
      <button
        class={styles.floatingToolbar__button}
        onClick={() => onSort('desc')}
        title="Sort Descending"
      >
        <span
          class="iconify"
          data-icon="carbon:arrow-down"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <div class={styles.floatingToolbar__divider}></div>
      <button
        class={styles.floatingToolbar__button}
        onClick={onFilter}
        title="Filter by this column"
      >
        <span class="iconify" data-icon="carbon:filter" style="width: 24px; height: 24px;"></span>
      </button>
      <button class={styles.floatingToolbar__button} onClick={onRename} title="Rename this column">
        <span class="iconify" data-icon="carbon:edit" style="width: 24px; height: 24px;"></span>
      </button>
      <button class={styles.floatingToolbar__button} onClick={onSplit} title="Split this column">
        <span
          class="iconify"
          data-icon="carbon:split-screen"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      {isDate && (
        <button class={styles.floatingToolbar__button} onClick={onDate} title="Date transformation">
          <span
            class="iconify"
            data-icon="carbon:calendar"
            style="width: 24px; height: 24px;"
          ></span>
        </button>
      )}
      <button
        class={styles.floatingToolbar__button}
        onClick={onDedupe}
        title="Dedupe by this column"
      >
        <span
          class="iconify"
          data-icon="carbon:checkbox-checked"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={`${styles.floatingToolbar__button} ${styles.danger}`}
        onClick={onRemove}
        title="Remove this column"
      >
        <span
          class="iconify"
          data-icon="carbon:trash-can"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
    </div>
  );
}
