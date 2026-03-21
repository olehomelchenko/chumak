import { useRef, useEffect, useMemo } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import styles from './FloatingToolbar.module.css';
import menuStyles from './ColumnToolbar.module.css';

/**
 * A single menu entry: either an action item or a visual divider.
 *
 * - `showFor`: if present, item only appears for these column types
 * - `hideFor`: if present, item is hidden for these column types
 * - When neither is set, the item appears for all types.
 */
type MenuEntry =
  | {
      type: 'item';
      id: string;
      icon: string;
      i18nKey: string;
      action: () => void;
      showFor?: string[];
      hideFor?: string[];
      danger?: boolean;
    }
  | { type: 'divider' };

interface ColumnToolbarProps {
  onSort: (order: 'asc' | 'desc') => void;
  onFilter: () => void;
  onRename: () => void;
  onSplit: () => void;
  onReplace: () => void;
  onDate: () => void;
  onSpread: () => void;
  onDedupe: () => void;
  onImpute: () => void;
  onDuplicate: () => void;
  onConvertType: () => void;
  onRemove: () => void;
  onRemoveMultiple: () => void;
  getColumnType: (col: string) => string;
}

function isItemVisible(entry: MenuEntry, columnType: string): boolean {
  if (entry.type === 'divider') return true;
  if (entry.showFor && !entry.showFor.includes(columnType)) return false;
  if (entry.hideFor && entry.hideFor.includes(columnType)) return false;
  return true;
}

/**
 * Filters menu entries by column type and collapses adjacent/trailing dividers.
 */
function getVisibleEntries(entries: MenuEntry[], columnType: string): MenuEntry[] {
  const filtered = entries.filter((entry) => isItemVisible(entry, columnType));
  // Remove leading dividers, trailing dividers, and consecutive dividers
  const result: MenuEntry[] = [];
  for (const entry of filtered) {
    if (entry.type === 'divider') {
      // Skip if first or if previous was also a divider
      if (result.length === 0 || result[result.length - 1].type === 'divider') continue;
    }
    result.push(entry);
  }
  // Remove trailing divider
  if (result.length > 0 && result[result.length - 1].type === 'divider') {
    result.pop();
  }
  return result;
}

export function ColumnToolbar({
  onSort,
  onFilter,
  onRename,
  onSplit,
  onReplace,
  onDate,
  onSpread,
  onDedupe,
  onImpute,
  onDuplicate,
  onConvertType,
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

  /**
   * Menu item definitions. Each entry is either an action item or a divider.
   * Type filtering:
   *   showFor — only these types see the item
   *   hideFor — these types don't see the item
   *   (neither) — visible for all types
   */
  const menuEntries: MenuEntry[] = useMemo(
    () => [
      // --- Sort ---
      {
        type: 'item',
        id: 'sortAsc',
        icon: 'carbon:arrow-up',
        i18nKey: 'toolbars.column.sortAsc',
        action: () => onSort('asc'),
        hideFor: ['json'],
      },
      {
        type: 'item',
        id: 'sortDesc',
        icon: 'carbon:arrow-down',
        i18nKey: 'toolbars.column.sortDesc',
        action: () => onSort('desc'),
        hideFor: ['json'],
      },
      { type: 'divider' },
      // --- Core column actions ---
      {
        type: 'item',
        id: 'filter',
        icon: 'carbon:filter',
        i18nKey: 'toolbars.column.filter',
        action: onFilter,
      },
      {
        type: 'item',
        id: 'rename',
        icon: 'carbon:edit',
        i18nKey: 'toolbars.column.rename',
        action: onRename,
      },
      {
        type: 'item',
        id: 'split',
        icon: 'carbon:split-screen',
        i18nKey: 'toolbars.column.split',
        action: onSplit,
        showFor: ['string'],
      },
      {
        type: 'item',
        id: 'replace',
        icon: 'carbon:find-and-replace',
        i18nKey: 'toolbars.column.replace',
        action: onReplace,
        showFor: ['string'],
      },
      {
        type: 'item',
        id: 'spread',
        icon: 'carbon:data-table',
        i18nKey: 'toolbars.column.spread',
        action: onSpread,
        showFor: ['json'],
      },
      {
        type: 'item',
        id: 'duplicate',
        icon: 'carbon:copy',
        i18nKey: 'toolbars.column.duplicate',
        action: onDuplicate,
      },
      { type: 'divider' },
      // --- Type-specific transforms ---
      {
        type: 'item',
        id: 'date',
        icon: 'carbon:calendar',
        i18nKey: 'toolbars.column.date',
        action: onDate,
        showFor: ['date', 'datetime'],
      },
      {
        type: 'item',
        id: 'dedupe',
        icon: 'carbon:replicate',
        i18nKey: 'toolbars.column.dedupe',
        action: onDedupe,
        hideFor: ['boolean', 'json'],
      },
      {
        type: 'item',
        id: 'impute',
        icon: 'material-symbols-light:edit-arrow-down-outline-rounded',
        i18nKey: 'toolbars.column.impute',
        action: onImpute,
        hideFor: ['boolean', 'json'],
      },
      { type: 'divider' },
      // --- Convert & Remove ---
      {
        type: 'item',
        id: 'convertType',
        icon: 'carbon:data-format',
        i18nKey: 'toolbars.column.convertType',
        action: onConvertType,
      },
      { type: 'divider' },
      {
        type: 'item',
        id: 'remove',
        icon: 'carbon:trash-can',
        i18nKey: 'toolbars.column.remove',
        action: onRemove,
        danger: true,
      },
    ],
    [
      onSort,
      onFilter,
      onRename,
      onSplit,
      onReplace,
      onDate,
      onSpread,
      onDedupe,
      onImpute,
      onDuplicate,
      onConvertType,
      onRemove,
    ]
  );

  const visibleEntries = useMemo(() => getVisibleEntries(menuEntries, type), [menuEntries, type]);

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
            {visibleEntries.map((entry, i) =>
              entry.type === 'divider' ? (
                <div key={`div-${i}`} class={menuStyles.menuDivider}></div>
              ) : (
                <button
                  key={entry.id}
                  class={`${menuStyles.menuItem}${entry.danger ? ` ${menuStyles.danger}` : ''}`}
                  role="menuitem"
                  onClick={() => handleMenuAction(entry.action)}
                >
                  <span class="iconify" aria-hidden="true" data-icon={entry.icon}></span>
                  {t(entry.i18nKey)}
                </button>
              )
            )}
          </div>
        </>
      )}
    </>
  );
}
