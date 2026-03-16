import { useRef } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';

interface RowToolbarProps {
  onRemoveRows: () => void;
  onKeepRows: () => void;
  onExtractToModel?: () => void;
  onPromoteToHeader?: () => void;
}

export function RowToolbar({
  onRemoveRows,
  onKeepRows,
  onExtractToModel,
  onPromoteToHeader,
}: RowToolbarProps) {
  const { t } = useTranslation('ui');
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
      aria-label={t('toolbars.row.ariaLabel')}
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
        {t('toolbars.row.label', { count: selectedRows.length })}
      </span>
      <div class={styles.floatingToolbar__divider}></div>
      <button
        class={styles.floatingToolbar__button}
        onClick={onKeepRows}
        title={t('toolbars.row.keepTitle', { count: selectedRows.length })}
        aria-label={t('toolbars.row.keepTitle', { count: selectedRows.length })}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="carbon:filter"
          style="width: 24px; height: 24px;"
        ></span>
      </button>
      <button
        class={`${styles.floatingToolbar__button} ${styles.danger}`}
        onClick={onRemoveRows}
        title={t('toolbars.row.removeTitle', { count: selectedRows.length })}
        aria-label={t('toolbars.row.removeTitle', { count: selectedRows.length })}
      >
        <span
          class="iconify"
          aria-hidden="true"
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
            title={t('toolbars.row.extractTitle', { count: selectedRows.length })}
            aria-label={t('toolbars.row.extractTitle', { count: selectedRows.length })}
          >
            <span
              class="iconify"
              aria-hidden="true"
              data-icon="carbon:data-table"
              style="width: 24px; height: 24px;"
            ></span>
          </button>
        </>
      )}
      {onPromoteToHeader && selectedRows.length === 1 && (
        <>
          <div class={styles.floatingToolbar__divider}></div>
          <button
            class={styles.floatingToolbar__button}
            onClick={onPromoteToHeader}
            title={t('toolbars.row.promoteTitle')}
            aria-label={t('toolbars.row.promoteTitle')}
          >
            <span
              class="iconify"
              aria-hidden="true"
              data-icon="material-symbols-light:vertical-align-top-rounded"
              style="width: 24px; height: 24px;"
            ></span>
          </button>
        </>
      )}
    </div>
  );
}
