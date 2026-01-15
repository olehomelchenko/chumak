import { AppStore } from '../stores/AppStore';
import styles from './TypeMenu.module.css';

export interface TypeMenuProps {
  onChangeType: (column: string, type: string) => void;
  onClose: () => void;
}

export function TypeMenu({ onChangeType, onClose }: TypeMenuProps) {
  const isOpen = AppStore.typeMenuOpen;
  const position = AppStore.typeMenuPos;
  const column = AppStore.typeMenuCol;

  if (!isOpen.value || !column.value) return null;

  const handleCreateTypeClick = (type: string) => (e: MouseEvent) => {
    e.stopPropagation();
    onChangeType(column.value!, type);
    onClose();
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
        <button class={styles.item} onClick={handleCreateTypeClick('string')}>
          <span class={`${styles.indicator} ${styles.string}`}>Aa</span> String
        </button>
        <button class={styles.item} onClick={handleCreateTypeClick('integer')}>
          <span class={`${styles.indicator} ${styles.integer}`}>#</span> Integer
        </button>
        <button class={styles.item} onClick={handleCreateTypeClick('float')}>
          <span class={`${styles.indicator} ${styles.float}`}>0.0</span> Float
        </button>
        <button class={styles.item} onClick={handleCreateTypeClick('boolean')}>
          <span class={`${styles.indicator} ${styles.boolean}`}>✓</span> Boolean
        </button>
        <button class={styles.item} onClick={handleCreateTypeClick('date')}>
          <span class={`${styles.indicator} ${styles.date}`}>
            <span class="iconify" data-icon="carbon:calendar"></span>
          </span>
          Date
        </button>
        <button class={styles.item} onClick={handleCreateTypeClick('datetime')}>
          <span class={`${styles.indicator} ${styles.datetime}`}>
            <span class="iconify" data-icon="ix:calendar"></span>
          </span>
          DateTime
        </button>
        <div class={styles.divider}></div>
        <button class={styles.item} onClick={handleCreateTypeClick('auto')}>
          <span class="iconify" data-icon="carbon:flash"></span>
          Auto-Detect
        </button>
      </div>
    </>
  );
}
