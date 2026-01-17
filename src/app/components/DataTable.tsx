import { AppStore } from '../stores/AppStore';
import type { DataRow } from '../types';
import { debugLogCurrentPage } from '../utils/debug-helpers';
import styles from './DataTable.module.css';

export interface DataTableProps {
  getPaginatedData: () => DataRow[];
  getColumnType: (column: string) => string;
  getTypeIcon: (column: string) => string;
  formatCellValue: (value: any) => string;
  formatCellValueForTooltip: (value: any) => string;
  onSelectColumn: (column: string, event: MouseEvent) => void;
  onSelectCell: (column: string, value: any, rowIndex: number, event: MouseEvent) => void;
  onOpenTypeMenu: (column: string, event: MouseEvent) => void;
  onClearColumnSelection: () => void;
  onScroll: () => void;
  onErrorCellClick?: (message: string) => void;
}

export function DataTable({
  getPaginatedData,
  getColumnType,
  getTypeIcon,
  formatCellValue,
  formatCellValueForTooltip,
  onSelectColumn,
  onSelectCell,
  onOpenTypeMenu,
  onClearColumnSelection,
  onScroll,
  onErrorCellClick,
}: DataTableProps) {
  const columns = AppStore.columns;
  const selectedColumn = AppStore.selectedColumn;
  const activeModel = AppStore.activeModel;
  const activeSource = AppStore.activeSource;
  const activeStepIndex = AppStore.activeStepIndex;
  const currentPage = AppStore.currentPage;

  const contextKey = `${activeModel.value?.id || activeSource.value?.id}-${activeStepIndex.value}-${columns.value.length}-${currentPage.value}`;

  const getCellClassName = (value: any, column: string, row: DataRow) => {
    const type = getColumnType(column);
    const classes = [styles.cell];

    if (['number', 'integer', 'float'].includes(type)) {
      classes.push(styles.number);
    }

    if (value === null || value === undefined || value === '') {
      classes.push(styles.empty);
    } else if (value === 0 || value === '0') {
      classes.push(styles.zero);
    } else if (value && typeof value === 'object' && value.type === 'error') {
      classes.push(styles.error);
    }

    if (row._removed) {
      classes.push(styles.removed);
    }

    return classes.join(' ');
  };

  const isDev = import.meta.env.DEV;

  return (
    <div class={styles.tableContainer} onScroll={onScroll}>
      {isDev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            debugLogCurrentPage();
          }}
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 1000,
            padding: '8px 12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          title="Debug: Log current page data to console (Dev only)"
        >
          🔍 Debug Page
        </button>
      )}
      <table class={styles.dataTable}>
        <thead>
          <tr>
            {columns.value.map((column) => (
              <th
                key={`${contextKey}-col-${column}`}
                class={`${styles.dataTable__header} ${selectedColumn.value === column ? styles.selected : ''}`}
                data-col={column}
                onClick={(e) => onSelectColumn(column, e as unknown as MouseEvent)}
                title={`Column: ${column}`}
              >
                <span
                  class={`${styles.typeIndicator} ${styles[getColumnType(column)] || ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTypeMenu(column, e as unknown as MouseEvent);
                  }}
                  title="Click to change type"
                >
                  <span class="iconify" data-icon={getTypeIcon(column)}></span>
                </span>
                <span>{column}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getPaginatedData().map((row, rowIndex) => (
            <tr
              key={`${contextKey}-${rowIndex}`}
              class={`${styles.dataTable__row} ${row._removed ? styles.removed : ''} ${row._duplicate ? styles.duplicate : ''}`}
              onClick={onClearColumnSelection}
            >
              {columns.value.map((column) => {
                const cellValue = row[column];
                const isError =
                  cellValue && typeof cellValue === 'object' && cellValue.type === 'error';
                const isBoolean = typeof cellValue === 'boolean';

                return (
                  <td
                    key={column}
                    class={getCellClassName(cellValue, column, row)}
                    data-col={column}
                    data-row={rowIndex}
                    title={`${column}: ${formatCellValueForTooltip(cellValue)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // If it's an error cell and we have a click handler, show the error message
                      if (isError && onErrorCellClick && cellValue.message) {
                        onErrorCellClick(cellValue.message);
                      } else {
                        onSelectCell(column, cellValue, rowIndex, e as unknown as MouseEvent);
                      }
                    }}
                  >
                    {isError ? (
                      <span class={styles.errorCell}>
                        <span class="iconify" data-icon="carbon:warning-filled"></span>
                        <span>{formatCellValue(cellValue)}</span>
                      </span>
                    ) : isBoolean ? (
                      <span
                        style={{
                          color: cellValue ? 'var(--color-green)' : 'var(--color-red)',
                          fontSize: '1.25rem',
                        }}
                      >
                        {formatCellValue(cellValue)}
                      </span>
                    ) : (
                      formatCellValue(cellValue)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
