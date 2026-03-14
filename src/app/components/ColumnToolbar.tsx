import { useRef, useEffect } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
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
  onDuplicate: () => void;
  onRemove: () => void;
  onRemoveMultiple: () => void;
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
  onDuplicate,
  onRemove,
  onRemoveMultiple,
  getColumnType,
}: ColumnToolbarProps) {
  const { t } = useTranslation('ui');
  const selectedColumn = AppStore.selectedColumn.value;
  const selectedColumns = AppStore.selectedColumns.value;
  const pos = AppStore.columnToolbarPos.value;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isMulti = selectedColumns.length > 1;

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

  if (!selectedColumn && selectedColumns.length === 0) return null;

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

  // Multi-column toolbar: show count + remove only
  if (isMulti) {
    return (
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={t('toolbars.column.ariaLabelMulti')}
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
        <span class={styles.floatingToolbar__label}>
          {t('toolbars.column.multiLabel', { count: selectedColumns.length })}
        </span>
        <div class={styles.floatingToolbar__divider}></div>
        <button
          class={`${styles.floatingToolbar__button} ${styles.danger}`}
          onClick={onRemoveMultiple}
          title={t('toolbars.column.multiRemoveTitle', { count: selectedColumns.length })}
          aria-label={t('toolbars.column.multiRemoveTitle', { count: selectedColumns.length })}
        >
          <span
            class="iconify"
            aria-hidden="true"
            data-icon="carbon:trash-can"
            style="width: 24px; height: 24px;"
          ></span>
        </button>
      </div>
    );
  }

  // Single-column toolbar
  const type = getColumnType(selectedColumn!);
  const isDate = ['date', 'datetime'].includes(type);

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t('toolbars.column.ariaLabel')}
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
        title={t('toolbars.column.sortAsc')}
        aria-label={t('toolbars.column.sortAsc')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:arrow-up"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={styles.floatingToolbar__button}
        onClick={() => onSort('desc')}
        title={t('toolbars.column.sortDesc')}
        aria-label={t('toolbars.column.sortDesc')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:arrow-down"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <div class={styles.floatingToolbar__divider}></div>
      <button
        class={styles.floatingToolbar__button}
        onClick={onFilter}
        title={t('toolbars.column.filter')}
        aria-label={t('toolbars.column.filter')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:filter"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={styles.floatingToolbar__button}
        onClick={onRename}
        title={t('toolbars.column.rename')}
        aria-label={t('toolbars.column.rename')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:edit"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={styles.floatingToolbar__button}
        onClick={onSplit}
        title={t('toolbars.column.split')}
        aria-label={t('toolbars.column.split')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:split-screen"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      {isDate && (
        <button
          class={styles.floatingToolbar__button}
          onClick={onDate}
          title={t('toolbars.column.date')}
          aria-label={t('toolbars.column.date')}
        >
          <span
            class="iconify"
            aria-hidden="true"
            data-icon="carbon:calendar"
            style="width: 24px; height: 24px;"
          ></span>
        </button>
      )}
      <button
        class={styles.floatingToolbar__button}
        onClick={onDedupe}
        title={t('toolbars.column.dedupe')}
        aria-label={t('toolbars.column.dedupe')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:checkbox-checked"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={styles.floatingToolbar__button}
        onClick={onImpute}
        title={t('toolbars.column.impute')}
        aria-label={t('toolbars.column.impute')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="material-symbols-light:edit-arrow-down-outline-rounded"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={styles.floatingToolbar__button}
        onClick={onDuplicate}
        title={t('toolbars.column.duplicate')}
        aria-label={t('toolbars.column.duplicate')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:copy"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={`${styles.floatingToolbar__button} ${styles.danger}`}
        onClick={onRemove}
        title={t('toolbars.column.remove')}
        aria-label={t('toolbars.column.remove')}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:trash-can"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
    </div>
  );
}
