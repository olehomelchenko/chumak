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

  if (!isOpen.value || !column.value) return null;

  const handleTypeClick = (type: string) => (e: MouseEvent) => {
    e.stopPropagation();
    // Close the type menu and open the conversion dialog
    AppStore.typeMenuOpen.value = false;
    if (column.value) {
      onOpenTypeConversionDialog(column.value, type);
    }
  };

  return (
    <>
      <div class={styles.overlay} onClick={onClose} />
      <div
        class={styles.typeMenu}
        style={{
          top: `${position.value.y}px`,
          left: `${position.value.x}px`,
        }}
      >
        <div class={styles.header}>Change Type</div>
        <button class={styles.item} onClick={handleTypeClick('string')}>
          <span class={`${styles.indicator} ${styles.string}`}>Aa</span> String
        </button>
        <button class={styles.item} onClick={handleTypeClick('integer')}>
          <span class={`${styles.indicator} ${styles.integer}`}>#</span> Integer
        </button>
        <button class={styles.item} onClick={handleTypeClick('float')}>
          <span class={`${styles.indicator} ${styles.float}`}>0.0</span> Float
        </button>
        <button class={styles.item} onClick={handleTypeClick('boolean')}>
          <span class={`${styles.indicator} ${styles.boolean}`}>✓</span> Boolean
        </button>
        <button class={styles.item} onClick={handleTypeClick('date')}>
          <span class={`${styles.indicator} ${styles.date}`}>
            <span class="iconify" data-icon="carbon:calendar"></span>
          </span>
          Date
        </button>
        <button class={styles.item} onClick={handleTypeClick('datetime')}>
          <span class={`${styles.indicator} ${styles.datetime}`}>
            <span class="iconify" data-icon="ix:calendar"></span>
          </span>
          DateTime
        </button>
        <div class={styles.divider}></div>
        <button class={styles.item} onClick={handleTypeClick('auto')}>
          <span class="iconify" data-icon="carbon:flash"></span>
          Auto-Detect
        </button>
      </div>
    </>
  );
}
