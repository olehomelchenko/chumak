// Note: 'h' import not needed - Vite's JSX transform handles it
import { AppStore } from '../stores/AppStore';

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
      <div
        class="type-menu-overlay"
        style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
        onClick={onClose}
      />
      <div
        class="type-menu"
        style={{
          top: `${position.value.y}px`,
          left: `${position.value.x}px`,
          position: 'fixed',
          zIndex: 2000,
          display: 'block',
        }}
      >
        <div class="type-menu__header">Change Type</div>
        <button class="type-menu__item" onClick={handleCreateTypeClick('string')}>
          <span class="type-indicator type-indicator--string">Aa</span> String
        </button>
        <button class="type-menu__item" onClick={handleCreateTypeClick('integer')}>
          <span class="type-indicator type-indicator--integer">#</span> Integer
        </button>
        <button class="type-menu__item" onClick={handleCreateTypeClick('float')}>
          <span class="type-indicator type-indicator--float">0.0</span> Float
        </button>
        <button class="type-menu__item" onClick={handleCreateTypeClick('boolean')}>
          <span class="type-indicator type-indicator--boolean">✓</span> Boolean
        </button>
        <button class="type-menu__item" onClick={handleCreateTypeClick('date')}>
          <span class="type-indicator type-indicator--date">
            <span class="iconify" data-icon="carbon:calendar"></span>
          </span>
          Date
        </button>
        <button class="type-menu__item" onClick={handleCreateTypeClick('datetime')}>
          <span class="type-indicator type-indicator--datetime">
            <span class="iconify" data-icon="ix:calendar"></span>
          </span>
          DateTime
        </button>
        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'var(--color-medium-gray)',
            margin: '4px 0',
          }}
        ></div>
        <button class="type-menu__item" onClick={handleCreateTypeClick('auto')}>
          <span
            class="iconify"
            data-icon="carbon:flash"
            style={{ width: '14px', height: '14px', marginRight: '4px' }}
          ></span>
          Auto-Detect
        </button>
      </div>
    </>
  );
}
