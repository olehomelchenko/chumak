import { useRef, useEffect } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';
import menuStyles from './ColumnToolbar.module.css';

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
  const selectedColumns = AppStore.selectedColumns.value;
  const pos = AppStore.columnToolbarPos.value;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isMulti = selectedColumns.length > 1;

  // Column menu state (dropdown from header chevron)
  const menuColumn = AppStore.columnMenuOpen.value;
  const menuPos = AppStore.columnMenuPos.value;
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus first menu item when column menu opens
  useEffect(() => {
    if (!menuColumn) return;
    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      const firstItem = menu.querySelector<HTMLElement>('button[role="menuitem"]');
      if (firstItem) firstItem.focus();
    });
  }, [menuColumn]);

  const closeMenu = (restoreFocus = false) => {
    const col = AppStore.columnMenuOpen.value;
    AppStore.columnMenuOpen.value = null;
    if (restoreFocus && col) {
      const header = document.querySelector<HTMLElement>(`th[data-col="${col}"]`);
      if (header) header.focus();
    }
  };

  const handleMenuAction = (action: () => void) => {
    closeMenu();
    action();
  };

  const handleMenuKeyDown = (e: KeyboardEvent) => {
    const menu = menuRef.current;
    if (!menu) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu(true);
      return;
    }

    const items = Array.from(menu.querySelectorAll<HTMLElement>('button[role="menuitem"]'));
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        items[0].focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        break;
    }
  };

  const handleToolbarKeyDown = (e: KeyboardEvent) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    if (e.key === 'Escape') return; // Let global handler clear selection

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

  // Determine column type for menu (conditional items)
  const type = menuColumn ? getColumnType(menuColumn) : '';
  const isDate = ['date', 'datetime'].includes(type);

  return (
    <>
      {/* Multi-column floating toolbar */}
      {isMulti && (
        <div
          key="multi"
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
          onKeyDown={handleToolbarKeyDown}
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
      )}

      {/* Column context menu (dropdown from header chevron) */}
      {menuColumn && (
        <>
          <div class={menuStyles.overlay} onClick={() => closeMenu()} />
          <div
            ref={menuRef}
            class={menuStyles.columnMenu}
            role="menu"
            aria-label={t('toolbars.column.ariaLabel')}
            style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
            onKeyDown={handleMenuKeyDown}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(() => onSort('asc'))}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:arrow-up"></span>
              {t('toolbars.column.sortAsc')}
            </button>
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(() => onSort('desc'))}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:arrow-down"></span>
              {t('toolbars.column.sortDesc')}
            </button>
            <div class={menuStyles.menuDivider}></div>
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(onFilter)}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:filter"></span>
              {t('toolbars.column.filter')}
            </button>
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(onRename)}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:edit"></span>
              {t('toolbars.column.rename')}
            </button>
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(onSplit)}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:split-screen"></span>
              {t('toolbars.column.split')}
            </button>
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(onDuplicate)}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:copy"></span>
              {t('toolbars.column.duplicate')}
            </button>
            <div class={menuStyles.menuDivider}></div>
            {isDate && (
              <button
                class={menuStyles.menuItem}
                role="menuitem"
                onClick={() => handleMenuAction(onDate)}
              >
                <span class="iconify" aria-hidden="true" data-icon="carbon:calendar"></span>
                {t('toolbars.column.date')}
              </button>
            )}
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(onDedupe)}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:replicate"></span>
              {t('toolbars.column.dedupe')}
            </button>
            <button
              class={menuStyles.menuItem}
              role="menuitem"
              onClick={() => handleMenuAction(onImpute)}
            >
              <span
                class="iconify"
                aria-hidden="true"
                data-icon="material-symbols-light:edit-arrow-down-outline-rounded"
              ></span>
              {t('toolbars.column.impute')}
            </button>
            <div class={menuStyles.menuDivider}></div>
            <button
              class={`${menuStyles.menuItem} ${menuStyles.danger}`}
              role="menuitem"
              onClick={() => handleMenuAction(onRemove)}
            >
              <span class="iconify" aria-hidden="true" data-icon="carbon:trash-can"></span>
              {t('toolbars.column.remove')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
