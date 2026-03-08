/**
 * ColumnRow - A row component for list-based column selection with drag-and-drop and renaming
 */

import formStyles from '../form-controls.module.css';
import colStyles from '../column-editor.module.css';
const styles = { ...formStyles, ...colStyles };

export interface ColumnRowProps {
  column: string;
  icon: string; // iconify icon name
  isSelected: boolean;
  isDragging: boolean;
  allowDrag?: boolean;
  allowRename?: boolean;
  renamedValue?: string;
  onToggle: () => void;
  onRename?: (value: string) => void;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}

export function ColumnRow({
  column,
  icon,
  isSelected,
  isDragging,
  allowDrag = false,
  allowRename = false,
  renamedValue = '',
  onToggle,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ColumnRowProps) {
  return (
    <div
      class={`${styles.columnEditorItem} ${!isSelected ? styles.unselected : ''} ${isDragging ? styles.dragging : ''}`}
      draggable={allowDrag}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drag Handle */}
      {allowDrag && <span class={styles.dragHandle}>⋮⋮</span>}

      {/* Checkbox */}
      <button type="button" class={styles.itemCheckbox} onClick={onToggle}>
        <span
          style={{
            color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
          }}
        >
          {isSelected ? '✓' : '✗'}
        </span>
      </button>

      {/* Type Icon */}
      <span class={`iconify ${styles.chipIcon}`} data-icon={icon} />

      {/* Original Name */}
      <span
        class={styles.originalName}
        style={{
          textDecoration: !isSelected ? 'line-through' : 'none',
          opacity: !isSelected ? 0.6 : 1,
        }}
      >
        {column}
      </span>

      {/* Arrow */}
      {isSelected && allowRename && <span class={styles.arrow}>→</span>}

      {/* Editable Name */}
      {allowRename && (
        <input
          type="text"
          class={`${styles.input} ${styles.renamedName}`}
          value={renamedValue}
          disabled={!isSelected}
          onInput={(e) => onRename && onRename((e.target as HTMLInputElement).value)}
          style={{
            opacity: !isSelected ? 0.4 : 1,
          }}
        />
      )}
    </div>
  );
}
