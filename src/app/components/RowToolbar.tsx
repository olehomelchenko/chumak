import { useRef } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';

interface RowToolbarProps {
  onRemoveRows: () => void;
  onKeepRows: () => void;
  onExtractToModel?: () => void;
}

export function RowToolbar({ onRemoveRows, onKeepRows, onExtractToModel }: RowToolbarProps) {
  const selectedRows = AppStore.selectedRows.value;
  const pos = AppStore.rowToolbarPos.value;
  const toolbarRef = useRef<HTMLDivElement>(null);

  if (selectedRows.length === 0) return null;

  const handleKeyDown = (e: KeyboardEvent) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

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
      aria-label="Row actions"
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
        {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''}
      </span>
      <div class={styles.floatingToolbar__divider}></div>
      <button
        class={styles.floatingToolbar__button}
        onClick={onKeepRows}
        title={`Keep only ${selectedRows.length} selected row${selectedRows.length !== 1 ? 's' : ''}`}
      >
        <span class="iconify" data-icon="carbon:filter" style="width: 24px; height: 24px;"></span>
      </button>
      <button
        class={`${styles.floatingToolbar__button} ${styles.danger}`}
        onClick={onRemoveRows}
        title={`Remove ${selectedRows.length} selected row${selectedRows.length !== 1 ? 's' : ''}`}
      >
        <span
          class="iconify"
          data-icon="carbon:trash-can"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      {onExtractToModel && (
        <>
          <div class={styles.floatingToolbar__divider}></div>
          <button
            class={styles.floatingToolbar__button}
            onClick={onExtractToModel}
            title={`Extract ${selectedRows.length} row${selectedRows.length !== 1 ? 's' : ''} to new model`}
          >
            <span
              class="iconify"
              data-icon="carbon:data-table"
              style="width: 24px; height: 24px;"
            ></span>
          </button>
        </>
      )}
    </div>
  );
}
