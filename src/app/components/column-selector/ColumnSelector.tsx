/**
 * ColumnSelector - Unified column selection component
 * Supports both chip grid and list display modes with single/multi-select
 */

import { useMemo, useState } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../../stores/AppStore';
import { ColumnChip } from './ColumnChip';
import { ColumnRow } from './ColumnRow';
import formStyles from '../form-controls.module.css';
import colStyles from '../column-editor.module.css';
const styles = { ...formStyles, ...colStyles };

export interface ColumnSelectorProps {
  // Data
  columns: string[];
  selectedColumns: string[] | string | null;
  onSelectionChange: (selected: string[] | string) => void;

  // Behavior
  mode: 'single' | 'multi';
  display: 'chip' | 'list';

  // Optional features
  allowDrag?: boolean;
  allowRename?: boolean;
  allowSelectAll?: boolean;
  disabledColumns?: string[];
  renameValues?: Record<string, string>;
  onRenameChange?: (column: string, newName: string) => void;
  onReorder?: (columns: string[]) => void;

  // Display customization
  maxHeight?: number;
  gridColumns?: 'auto' | 2 | 4;

  // Labels
  label?: string;
  helpText?: string;

  // Search
  searchable?: boolean;
}

export function ColumnSelector({
  columns,
  selectedColumns,
  onSelectionChange,
  mode,
  display,
  allowDrag = false,
  allowRename = false,
  allowSelectAll = false,
  disabledColumns = [],
  renameValues = {},
  onRenameChange,
  onReorder,
  maxHeight,
  gridColumns = 'auto',
  label,
  helpText,
  searchable = false,
}: ColumnSelectorProps) {
  const { t } = useTranslation('dialogs');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  // Get column type from schema
  const getColumnType = (columnName: string): string => {
    const schema = AppStore.activeModel.value?.schema || [];
    const col = schema.find((c: any) => c.name === columnName);
    if (col) return col.type;

    if (AppStore.activeSource.value?.columns) {
      const sourceCol = AppStore.activeSource.value.columns.find((c: any) => c.name === columnName);
      if (sourceCol) return sourceCol.type;
    }
    return 'string';
  };

  // Get icon for a column based on its type
  const getIcon = (columnName: string): string => {
    const type = getColumnType(columnName);

    switch (type) {
      case 'date':
      case 'datetime':
        return 'ix:calendar';
      case 'time':
        return 'carbon:time';
      case 'float':
      case 'number':
        return 'ix:data-type-double';
      case 'string':
        return 'ix:data-type-string';
      case 'boolean':
        return 'ix:data-type-boolean';
      case 'integer':
        return 'ix:data-type-integer';
      case 'json':
        return 'mdi:code-json';
      default:
        return 'ix:data-type-string';
    }
  };

  // Check if a column is selected
  const isSelected = (column: string): boolean => {
    if (mode === 'single') {
      return selectedColumns === column;
    }
    return Array.isArray(selectedColumns) && selectedColumns.includes(column);
  };

  // Handle selection change
  const handleSelectionChange = (column: string) => {
    if (mode === 'single') {
      onSelectionChange(column);
    } else {
      const currentSelected = Array.isArray(selectedColumns) ? selectedColumns : [];
      if (currentSelected.includes(column)) {
        onSelectionChange(currentSelected.filter((c) => c !== column));
      } else {
        onSelectionChange([...currentSelected, column]);
      }
    }
  };

  // Handle Select All
  const handleSelectAll = () => {
    const availableColumns = columns.filter((col) => !disabledColumns.includes(col));
    onSelectionChange(availableColumns);
  };

  // Handle Select None
  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => (e: DragEvent) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (targetIndex: number) => () => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, movedColumn);

    if (onReorder) {
      onReorder(newColumns);
    }

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Filter columns by search text
  const filteredColumns = useMemo(() => {
    if (!searchable || !searchText) return columns;
    const lower = searchText.toLowerCase();
    return columns.filter((col) => col.toLowerCase().includes(lower));
  }, [searchable, searchText, columns]);

  // Drag is unsafe when search filters the list — indices won't match the full array
  const effectiveAllowDrag = allowDrag && !searchText;

  // Determine grid class
  const getGridClass = () => {
    if (gridColumns === 2) return styles.chipGrid2;
    if (gridColumns === 4) return styles.chipGrid4;
    return styles.chipGrid;
  };

  return (
    <div>
      {/* Label */}
      {label && <label class={styles.label}>{label}</label>}

      {/* Search Input */}
      {searchable && (
        <input
          type="text"
          class={styles.input}
          placeholder={t('common.placeholders.searchColumns')}
          value={searchText}
          onInput={(e) => setSearchText(e.currentTarget.value)}
          style={{ marginBottom: 'var(--space-sm)' }}
        />
      )}

      {/* Select All/None buttons */}
      {allowSelectAll && mode === 'multi' && (
        <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
          <button type="button" class="button button--text button--small" onClick={handleSelectAll}>
            Select All
          </button>
          <button
            type="button"
            class="button button--text button--small"
            onClick={handleSelectNone}
          >
            Select None
          </button>
        </div>
      )}

      {/* Chip Grid Display */}
      {display === 'chip' && (
        <div class={getGridClass()} style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}>
          {filteredColumns.map((column) => (
            <ColumnChip
              key={column}
              label={column}
              icon={getIcon(column)}
              isActive={isSelected(column)}
              onClick={() => handleSelectionChange(column)}
              disabled={disabledColumns.includes(column)}
              showCheckmark={mode === 'multi'}
            />
          ))}
        </div>
      )}

      {/* List Display */}
      {display === 'list' && (
        <div
          class={styles.columnEditorList}
          style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
        >
          {filteredColumns.map((column, index) => (
            <ColumnRow
              key={column}
              column={column}
              icon={getIcon(column)}
              isSelected={isSelected(column)}
              isDragging={draggedIndex === index}
              allowDrag={effectiveAllowDrag}
              allowRename={allowRename}
              renamedValue={renameValues[column] || column}
              onToggle={() => handleSelectionChange(column)}
              onRename={(value) => onRenameChange && onRenameChange(column, value)}
              onDragStart={effectiveAllowDrag ? handleDragStart(index) : undefined}
              onDragOver={effectiveAllowDrag ? handleDragOver : undefined}
              onDrop={effectiveAllowDrag ? handleDrop(index) : undefined}
              onDragEnd={effectiveAllowDrag ? handleDragEnd : undefined}
            />
          ))}
        </div>
      )}

      {/* Help Text */}
      {helpText && <p class={styles.helpText}>{helpText}</p>}
    </div>
  );
}
