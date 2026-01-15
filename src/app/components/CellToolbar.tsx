import { AppStore } from '../stores/AppStore';

interface CellToolbarProps {
  onFilter: (op: 'exact' | 'not' | 'gt' | 'gte' | 'lt' | 'lte') => void;
  onReplace: () => void;
}

export function CellToolbar({ onFilter, onReplace }: CellToolbarProps) {
  const selectedCell = AppStore.selectedCell.value;
  const pos = AppStore.cellToolbarPos.value;

  if (!selectedCell || selectedCell.isEda) return null;

  const { type } = selectedCell;
  const isDate = ['date', 'datetime'].includes(type);
  const isComparable = ['number', 'integer', 'float', 'date', 'datetime'].includes(type);

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
      <button
        class="floating-toolbar__button"
        onClick={() => onFilter('exact')}
        title={isComparable ? 'Keep only this value (=)' : 'Keep only this value'}
      >
        <span class="iconify" data-icon="carbon:filter"></span>
        {isComparable && (
          <span style={{ fontSize: '10px', marginLeft: '2px', fontWeight: 'bold' }}>=</span>
        )}
      </button>

      <button
        class="floating-toolbar__button"
        onClick={() => onFilter('not')}
        title={isComparable ? 'Exclude this value (≠)' : 'Exclude this value'}
        style={{ color: 'var(--color-dark-red)' }}
      >
        <span class="iconify" data-icon="carbon:filter-remove"></span>
      </button>

      <div
        style={{ width: '1px', background: 'var(--color-medium-gray)', margin: '4px 2px' }}
      ></div>

      <button class="floating-toolbar__button" onClick={onReplace} title="Replace this value">
        <span class="iconify" data-icon="codicon:replace"></span>
      </button>

      {isComparable && (
        <div style={{ display: 'flex', gap: '2px' }}>
          <div
            style={{ width: '1px', background: 'var(--color-medium-gray)', margin: '4px 2px' }}
          ></div>
          <button
            class="floating-toolbar__button"
            onClick={() => onFilter('gt')}
            title={isDate ? 'Keep values after this date' : 'Keep values greater than (>)'}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              &gt;
            </span>
          </button>
          <button
            class="floating-toolbar__button"
            onClick={() => onFilter('gte')}
            title={
              isDate ? 'Keep values on or after this date' : 'Keep values greater than or equal (≥)'
            }
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              &ge;
            </span>
          </button>
          <button
            class="floating-toolbar__button"
            onClick={() => onFilter('lt')}
            title={isDate ? 'Keep values before this date' : 'Keep values less than (<)'}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              &lt;
            </span>
          </button>
          <button
            class="floating-toolbar__button"
            onClick={() => onFilter('lte')}
            title={
              isDate ? 'Keep values on or before this date' : 'Keep values less than or equal (≤)'
            }
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              &le;
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
