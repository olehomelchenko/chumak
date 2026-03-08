import formStyles from '../form-controls.module.css';
import colStyles from '../column-editor.module.css';
const styles = { ...formStyles, ...colStyles };

interface JoinColumnSelectorProps {
  label: string;
  columns: string[];
  selectedColumns: string[];
  onToggle: (column: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export function JoinColumnSelector({
  label,
  columns,
  selectedColumns,
  onToggle,
  onSelectAll,
  onSelectNone,
}: JoinColumnSelectorProps) {
  return (
    <div class={styles.group}>
      <label class={styles.label}>{label}</label>
      <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
        <button type="button" class="button button--text button--small" onClick={onSelectAll}>
          Select All
        </button>
        <button type="button" class="button button--text button--small" onClick={onSelectNone}>
          Select None
        </button>
      </div>
      <div class={styles.columnEditorList}>
        {columns.map((col) => {
          const isSelected = selectedColumns.includes(col);
          return (
            <div
              key={col}
              class={`${styles.columnEditorItem} ${!isSelected ? styles.unselected : ''}`}
            >
              {/* Checkbox */}
              <button type="button" class={styles.itemCheckbox} onClick={() => onToggle(col)}>
                <span
                  style={{
                    color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                  }}
                >
                  {isSelected ? '✓' : '✗'}
                </span>
              </button>

              {/* Column Name */}
              <span
                class={styles.originalName}
                style={{
                  textDecoration: !isSelected ? 'line-through' : 'none',
                  opacity: !isSelected ? 0.6 : 1,
                }}
              >
                {col}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
