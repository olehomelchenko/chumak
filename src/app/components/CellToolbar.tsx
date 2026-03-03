import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';

interface CellToolbarProps {
  onFilter: (op: 'exact' | 'not' | 'gt' | 'gte' | 'lt' | 'lte') => void;
  onReplace: () => void;
}

export function CellToolbar({ onFilter, onReplace }: CellToolbarProps) {
  const { t } = useTranslation('ui');
  const selectedCell = AppStore.selectedCell.value;
  const pos = AppStore.cellToolbarPos.value;

  if (!selectedCell || AppStore.selectedRows.value.length > 0) return null;

  const { type, isEda } = selectedCell;
  const isComparable = ['number', 'integer', 'float', 'date', 'datetime'].includes(type);

  // For EDA stats, only show comparison operators (gt, gte, lt, lte)
  if (isEda) {
    if (!isComparable) return null;

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
        <div class={styles.floatingToolbar__comparableGroup}>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('gt')}
            title={t('toolbars.cell.filterGt')}
          >
            <span class={styles.floatingToolbar__textOp}>&gt;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('gte')}
            title={t('toolbars.cell.filterGte')}
          >
            <span class={styles.floatingToolbar__textOp}>&ge;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('lt')}
            title={t('toolbars.cell.filterLt')}
          >
            <span class={styles.floatingToolbar__textOp}>&lt;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('lte')}
            title={t('toolbars.cell.filterLte')}
          >
            <span class={styles.floatingToolbar__textOp}>&le;</span>
          </button>
        </div>
      </div>
    );
  }

  // Regular cell toolbar (non-EDA)
  const isDateType = type.includes('date');

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
        title={isComparable ? t('toolbars.cell.filterExact') : t('toolbars.cell.filterExactSimple')}
      >
        <span class="iconify" data-icon="carbon:filter" style="width: 24px; height: 24px;"></span>
        {isComparable && <span class={styles.floatingToolbar__operatorLabel}>=</span>}
      </button>

      <button
        class={`${styles.floatingToolbar__button} ${styles.danger}`}
        onClick={() => onFilter('not')}
        title={isComparable ? t('toolbars.cell.filterNot') : t('toolbars.cell.filterNotSimple')}
      >
        <span
          class="iconify"
          data-icon="carbon:filter-remove"
          style="width: 24px; height: 24px;"
        ></span>
      </button>

      <div class={styles.floatingToolbar__divider}></div>

      <button
        class={styles.floatingToolbar__button}
        onClick={onReplace}
        title={t('toolbars.cell.replace')}
      >
        <span class="iconify" data-icon="codicon:replace" style="width: 24px; height: 24px;"></span>
      </button>

      {isComparable && (
        <div class={styles.floatingToolbar__comparableGroup}>
          <div class={styles.floatingToolbar__divider}></div>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('gt')}
            title={isDateType ? t('toolbars.cell.filterGtDate') : t('toolbars.cell.filterGt')}
          >
            <span class={styles.floatingToolbar__textOp}>&gt;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('gte')}
            title={isDateType ? t('toolbars.cell.filterGteDate') : t('toolbars.cell.filterGte')}
          >
            <span class={styles.floatingToolbar__textOp}>&ge;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('lt')}
            title={isDateType ? t('toolbars.cell.filterLtDate') : t('toolbars.cell.filterLt')}
          >
            <span class={styles.floatingToolbar__textOp}>&lt;</span>
          </button>
          <button
            class={styles.floatingToolbar__button}
            onClick={() => onFilter('lte')}
            title={isDateType ? t('toolbars.cell.filterLteDate') : t('toolbars.cell.filterLte')}
          >
            <span class={styles.floatingToolbar__textOp}>&le;</span>
          </button>
        </div>
      )}
    </div>
  );
}
