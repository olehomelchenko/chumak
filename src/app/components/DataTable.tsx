// Note: 'h' import not needed - Vite's JSX transform handles it
import { AppStore } from '../stores/AppStore';
import type { DataRow } from '../types';

export interface DataTableProps {
  getPaginatedData: () => DataRow[];
  getColumnType: (column: string) => string;
  getTypeIcon: (column: string) => string;
  getCellClass: (value: any, column: string) => string;
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
  getCellClass,
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

  return (
    <div class="table-container" onScroll={onScroll}>
      <table class="data-table">
        <thead>
          <tr>
            {columns.value.map((column) => (
              <th
                key={`${contextKey}-col-${column}`}
                class={`data-table__header${selectedColumn.value === column ? ' data-table__header--selected' : ''}`}
                data-col={column}
                onClick={(e) => onSelectColumn(column, e as unknown as MouseEvent)}
                title={`Column: ${column}`}
              >
                <span
                  class={`type-indicator type-indicator--${getColumnType(column)}`}
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
              class="data-table__row"
              onClick={onClearColumnSelection}
            >
              {columns.value.map((column) => (
                <td
                  key={column}
                  class={getCellClass(row[column], column)}
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
