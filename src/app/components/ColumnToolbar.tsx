import { AppStore } from '../stores/AppStore';

interface ColumnToolbarProps {
  onSort: (order: 'asc' | 'desc') => void;
  onFilter: () => void;
  onRename: () => void;
  onSplit: () => void;
  onDate: () => void;
  onDedupe: () => void;
  onRemove: () => void;
  getColumnType: (col: string) => string;
}

export function ColumnToolbar({
  onSort,
  onFilter,
  onRename,
  onSplit,
  onDate,
  onDedupe,
  onRemove,
  getColumnType,
}: ColumnToolbarProps) {
  const selectedColumn = AppStore.selectedColumn.value;
  const pos = AppStore.columnToolbarPos.value;

  if (!selectedColumn) return null;

  const type = getColumnType(selectedColumn);
  const isDate = ['date', 'datetime'].includes(type);

  return (
    <div
      class="floating-toolbar"
      style={
        {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          '--arrow-offset': `${pos.arrowOffset}px`,
        } as any
      }
      onClick={(e) => e.stopPropagation()}
    >
      <button class="floating-toolbar__button" onClick={() => onSort('asc')} title="Sort Ascending">
        <span class="iconify" data-icon="carbon:arrow-up"></span>
      </button>
      <button
        class="floating-toolbar__button"
        onClick={() => onSort('desc')}
        title="Sort Descending"
      >
        <span class="iconify" data-icon="carbon:arrow-down"></span>
      </button>
      <div
        style={{ width: '1px', background: 'var(--color-medium-gray)', margin: '4px 2px' }}
      ></div>
      <button class="floating-toolbar__button" onClick={onFilter} title="Filter by this column">
        <span class="iconify" data-icon="carbon:filter"></span>
      </button>
      <button class="floating-toolbar__button" onClick={onRename} title="Rename this column">
        <span class="iconify" data-icon="carbon:edit"></span>
      </button>
      <button class="floating-toolbar__button" onClick={onSplit} title="Split this column">
        <span class="iconify" data-icon="carbon:split-screen"></span>
      </button>
      {isDate && (
        <button class="floating-toolbar__button" onClick={onDate} title="Date transformation">
          <span class="iconify" data-icon="carbon:calendar"></span>
        </button>
      )}
      <button class="floating-toolbar__button" onClick={onDedupe} title="Dedupe by this column">
        <span class="iconify" data-icon="carbon:checkbox-checked"></span>
      </button>
      <button
        class="floating-toolbar__button"
        onClick={onRemove}
        title="Remove this column"
        style={{ color: 'var(--color-dark-red)' }}
      >
        <span class="iconify" data-icon="carbon:trash-can"></span>
      </button>
    </div>
  );
}
