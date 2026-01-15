import { AppStore } from '../stores/AppStore';
import type { DataRow } from '../types';
import styles from './DataTable.module.css';

export interface DataTableProps {
  getPaginatedData: () => DataRow[];
  getColumnType: (column: string) => string;
  getTypeIcon: (column: string) => string;
  formatCellValue: (value: any) => string;
  onSelectColumn: (column: string, event: MouseEvent) => void;
  onSelectCell: (column: string, value: any, rowIndex: number, event: MouseEvent) => void;
  onOpenTypeMenu: (column: string, event: MouseEvent) => void;
  onClearColumnSelection: () => void;
  onScroll: () => void;
}

export function DataTable({
  getPaginatedData,
  getColumnType,
  getTypeIcon,
  formatCellValue,
  onSelectColumn,
  onSelectCell,
  onOpenTypeMenu,
  onClearColumnSelection,
  onScroll,
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
    }

    if (row._removed) {
      classes.push(styles.removed);
    }

    return classes.join(' ');
  };

  return (
    <div class={styles.tableContainer} onScroll={onScroll}>
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
              {columns.value.map((column) => (
                <td
                  key={column}
                  class={getCellClassName(row[column], column, row)}
                  data-col={column}
                  data-row={rowIndex}
                  title={`${column}: ${row[column]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCell(column, row[column], rowIndex, e as unknown as MouseEvent);
                  }}
                >
                  {formatCellValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
