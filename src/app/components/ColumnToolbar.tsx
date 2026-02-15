import { useRef, useEffect } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';

interface ColumnToolbarProps {
  onSort: (order: 'asc' | 'desc') => void;
  onFilter: () => void;
  onRename: () => void;
  onSplit: () => void;
  onDate: () => void;
  onDedupe: () => void;
  onImpute: () => void;
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
  onImpute,
  onRemove,
  getColumnType,
}: ColumnToolbarProps) {
  const selectedColumn = AppStore.selectedColumn.value;
  const pos = AppStore.columnToolbarPos.value;
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Auto-focus first button when opened via keyboard
  useEffect(() => {
    if (!selectedColumn || !AppStore.columnToolbarFocusRequested.value) return;
    AppStore.columnToolbarFocusRequested.value = false;
    // Wait for toolbar positioning (happens in requestAnimationFrame)
    requestAnimationFrame(() => {
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const firstButton = toolbar.querySelector<HTMLElement>('button');
      if (firstButton) firstButton.focus();
    });
  }, [selectedColumn]);

  if (!selectedColumn) return null;

  const type = getColumnType(selectedColumn);
  const isDate = ['date', 'datetime'].includes(type);

  const handleKeyDown = (e: KeyboardEvent) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    if (e.key === 'Escape') {
      // Return focus to the column header
      const header = document.querySelector<HTMLElement>(`th[data-col="${selectedColumn}"]`);
      if (header) header.focus();
      return; // Let global handler clear the selection
    }

    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();

    const buttons = Array.from(toolbar.querySelectorAll<HTMLElement>('button'));
    if (buttons.length === 0) return;

    const idx = buttons.indexOf(document.activeElement as HTMLElement);

    let nextIdx: number;
    switch (e.key) {
      case 'ArrowRight':
        nextIdx = idx < buttons.length - 1 ? idx + 1 : 0;
        break;
      case 'ArrowLeft':
        nextIdx = idx > 0 ? idx - 1 : buttons.length - 1;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = buttons.length - 1;
        break;
      default:
        return;
    }
    buttons[nextIdx].focus();
  };

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Column actions"
      class={styles.floatingToolbar}
      style={
        {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          '--arrow-offset': `${pos.arrowOffset}px`,
        } as any
      }
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
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
        class={styles.floatingToolbar__button}
        onClick={onImpute}
        title="Impute missing values"
      >
        <span
          class="iconify"
          data-icon="material-symbols-light:edit-arrow-down-outline-rounded"
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
