import { useRef, useEffect } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import styles from './TypeMenu.module.css';

export interface TypeMenuProps {
  onChangeType: (column: string, type: string) => void;
  onClose: () => void;
  onOpenTypeConversionDialog: (column: string, type: string) => void;
}

export function TypeMenu({ onClose, onOpenTypeConversionDialog }: TypeMenuProps) {
  const isOpen = AppStore.typeMenuOpen;
  const position = AppStore.typeMenuPos;
  const column = AppStore.typeMenuCol;

  const menuRef = useRef<HTMLDivElement>(null);

  if (!isOpen.value || !column.value) return null;

  const handleTypeClick = (type: string) => (e: MouseEvent) => {
    e.stopPropagation();
    // Close the type menu and open the conversion dialog
    AppStore.typeMenuOpen.value = false;
    if (column.value) {
      onOpenTypeConversionDialog(column.value, type);
    }
  };

  // Focus first menu item when menu opens
  useEffect(() => {
    if (!isOpen.value) return;
    const menu = menuRef.current;
    if (!menu) return;
    const firstItem = menu.querySelector<HTMLElement>('button[role="menuitem"]');
    if (firstItem) firstItem.focus();
  }, [isOpen.value]);

  const handleKeyDown = (e: KeyboardEvent) => {
    const menu = menuRef.current;
    if (!menu) return;

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

  return (
    <>
      <div class={styles.overlay} onClick={onClose} />
      <div
        ref={menuRef}
        class={styles.typeMenu}
        role="menu"
        onKeyDown={handleKeyDown}
        style={{
          top: `${position.value.y}px`,
          left: `${position.value.x}px`,
        }}
      >
        <div class={styles.header}>Change Type</div>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('string')}>
          <span class={`${styles.indicator} ${styles.string}`}>Aa</span> String
        </button>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('integer')}>
          <span class={`${styles.indicator} ${styles.integer}`}>#</span> Integer
        </button>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('float')}>
          <span class={`${styles.indicator} ${styles.float}`}>0.0</span> Float
        </button>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('boolean')}>
          <span class={`${styles.indicator} ${styles.boolean}`}>✓</span> Boolean
        </button>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('date')}>
          <span class={`${styles.indicator} ${styles.date}`}>
            <span class="iconify" data-icon="carbon:calendar"></span>
          </span>
          Date
        </button>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('datetime')}>
          <span class={`${styles.indicator} ${styles.datetime}`}>
            <span class="iconify" data-icon="ix:calendar"></span>
          </span>
          DateTime
        </button>
        <div class={styles.divider}></div>
        <button class={styles.item} role="menuitem" onClick={handleTypeClick('auto')}>
          <span class="iconify" data-icon="carbon:flash"></span>
          Auto-Detect
        </button>
      </div>
    </>
  );
}
