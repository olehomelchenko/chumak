import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import type { DataRow } from '../types';
import type { ColumnQuality } from '../../core/eda-engine';
import { debugLogCurrentPage } from '../utils/debug-helpers';
import { isConversionError } from '../../core/type-converter';
import styles from './DataTable.module.css';

function QualityBar({ q, t }: { q: ColumnQuality; t: (key: string) => string }) {
  const errorWidth = Math.round(q.errorPct * 100) / 100;
  const missingWidth = Math.round(q.nullPct * 100) / 100;
  if (errorWidth === 0 && missingWidth === 0) return null;
  const parts: string[] = [];
  if (errorWidth > 0) parts.push(`${Math.round(q.errorPct)}% ${t('dataTable.qualityErrors')}`);
  if (missingWidth > 0) parts.push(`${Math.round(q.nullPct)}% ${t('dataTable.qualityMissing')}`);
  return (
    <div class={styles.qualityBar} title={parts.join(', ')}>
      {errorWidth > 0 && (
        <div class={styles.qualityBar__error} style={{ width: `${errorWidth}%` }} />
      )}
      {missingWidth > 0 && (
        <div class={styles.qualityBar__missing} style={{ width: `${missingWidth}%` }} />
      )}
    </div>
  );
}

export interface DataTableProps {
  getPaginatedData: () => DataRow[];
  getColumnType: (column: string) => string;
  getTypeIcon: (column: string) => string;
  formatCellValue: (value: any) => string;
  formatCellValueForTooltip: (value: any) => string;
  onSelectColumn: (column: string, event: MouseEvent) => void;
  onSelectCell: (column: string, value: any, rowIndex: number, event: MouseEvent) => void;
  onOpenTypeMenu: (column: string, event: MouseEvent) => void;
  onOpenColumnMenu: (column: string, event: MouseEvent) => void;
  onSelectRow: (absoluteRowIndex: number, event: MouseEvent) => void;
  onScroll: () => void;
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
  onOpenColumnMenu,
  onSelectRow,
  onScroll,
}: DataTableProps) {
  const { t } = useTranslation('ui');
  const columns = AppStore.columns;
  const selectedColumn = AppStore.selectedColumn;
  const activeModel = AppStore.activeModel;
  const activeSource = AppStore.activeSource;
  const activeStepIndex = AppStore.activeStepIndex;
  const currentPage = AppStore.currentPage;
  const selectedRows = AppStore.selectedRows;

  const columnQuality = AppStore.columnQuality;

  const contextKey = `${activeModel.value?.id || activeSource.value?.id}-${activeStepIndex.value}-${columns.value.length}-${currentPage.value}`;
  const pageOffset = (currentPage.value - 1) * AppStore.pageSize.value;

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
    } else if (isConversionError(value)) {
      classes.push(styles.error);
    }

    if (row._removed) {
      classes.push(styles.removed);
    }

    if (AppStore.selectedColumns.value.includes(column)) {
      classes.push(styles.selectedColumn);
    }

    return classes.join(' ');
  };

  const handleHeaderKeyDown = (column: string, e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenColumnMenu(column, e as unknown as MouseEvent);
      return;
    }

    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!arrowKeys.includes(e.key)) return;

    e.preventDefault();
    const th = e.currentTarget as HTMLElement;
    const headers = Array.from(th.parentElement!.querySelectorAll<HTMLElement>('th[data-col]'));
    const idx = headers.indexOf(th);

    let nextIdx: number;
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      // Clamp at boundaries during range selection (no wrapping)
      if (e.key === 'ArrowRight') {
        if (idx >= headers.length - 1) return;
        nextIdx = idx + 1;
      } else {
        if (idx <= 0) return;
        nextIdx = idx - 1;
      }
      const nextCol = headers[nextIdx].dataset.col;
      if (nextCol) {
        onSelectColumn(nextCol, {
          shiftKey: true,
          metaKey: false,
          ctrlKey: false,
          stopPropagation() {},
        } as unknown as MouseEvent);
      }
    } else {
      switch (e.key) {
        case 'ArrowRight':
          nextIdx = idx < headers.length - 1 ? idx + 1 : 0;
          break;
        case 'ArrowLeft':
          nextIdx = idx > 0 ? idx - 1 : headers.length - 1;
          break;
        case 'Home':
          nextIdx = 0;
          break;
        case 'End':
          nextIdx = headers.length - 1;
          break;
        default:
          return;
      }
    }

    // Roving tabindex: move the tab stop
    th.setAttribute('tabindex', '-1');
    headers[nextIdx!].setAttribute('tabindex', '0');
    headers[nextIdx!].focus();
  };

  const handleGutterKeyDown = (absoluteIndex: number, e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectRow(absoluteIndex, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        stopPropagation() {},
      } as unknown as MouseEvent);
      return;
    }

    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    const td = e.currentTarget as HTMLElement;
    const gutters = Array.from(
      td.closest('tbody')!.querySelectorAll<HTMLElement>('td[data-row-gutter]')
    );
    const idx = gutters.indexOf(td);

    let nextIdx: number;
    if (e.shiftKey) {
      // Clamp at boundaries during range selection (no wrapping)
      if (e.key === 'ArrowDown') {
        if (idx >= gutters.length - 1) return;
        nextIdx = idx + 1;
      } else {
        if (idx <= 0) return;
        nextIdx = idx - 1;
      }
      const nextAbsoluteIndex = pageOffset + nextIdx;
      onSelectRow(nextAbsoluteIndex, {
        shiftKey: true,
        metaKey: false,
        ctrlKey: false,
        stopPropagation() {},
      } as unknown as MouseEvent);
    } else {
      // Wrap around for plain navigation
      if (e.key === 'ArrowDown') {
        nextIdx = idx < gutters.length - 1 ? idx + 1 : 0;
      } else {
        nextIdx = idx > 0 ? idx - 1 : gutters.length - 1;
      }
    }

    // Roving tabindex
    td.setAttribute('tabindex', '-1');
    gutters[nextIdx!].setAttribute('tabindex', '0');
    gutters[nextIdx!].focus();
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
          Debug Page
        </button>
      )}
      <table class={styles.dataTable} aria-label={t('dataTable.ariaLabel')}>
        <thead>
          <tr>
            <th class={styles.rowGutter}></th>
            {columns.value.map((column, i) => (
              <th
                key={`${contextKey}-col-${column}`}
                class={`${styles.dataTable__header} ${AppStore.selectedColumns.value.includes(column) ? styles.selected : ''}`}
                data-col={column}
                tabIndex={
                  selectedColumn.value === column
                    ? 0
                    : !selectedColumn.value && !AppStore.selectedColumns.value.length && i === 0
                      ? 0
                      : -1
                }
                aria-selected={AppStore.selectedColumns.value.includes(column) || undefined}
                onClick={(e) => onSelectColumn(column, e)}
                onKeyDown={(e) => handleHeaderKeyDown(column, e)}
                title={`Column: ${column}`}
              >
                <div class={styles.headerContent}>
                  <span
                    class={`${styles.typeIndicator} ${styles[getColumnType(column)] || ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTypeMenu(column, e as unknown as MouseEvent);
                    }}
                    title={t('dataTable.typeMenuTooltip')}
                  >
                    <span class="iconify" aria-hidden="true" data-icon={getTypeIcon(column)}></span>
                  </span>
                  <span class={styles.headerLabel}>{column}</span>
                  <button
                    class={styles.columnMenuTrigger}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenColumnMenu(column, e as unknown as MouseEvent);
                    }}
                    title={t('dataTable.columnMenuTooltip')}
                    aria-label={t('dataTable.columnMenuTooltip')}
                    tabIndex={-1}
                  >
                    <span class="iconify" aria-hidden="true" data-icon="carbon:chevron-down"></span>
                  </button>
                </div>
                {columnQuality.value[column] && (
                  <QualityBar q={columnQuality.value[column]} t={t} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getPaginatedData().length === 0 && columns.value.length > 0 ? (
            <tr class={styles.emptyStateRow}>
              <td colSpan={columns.value.length + 1} class={styles.emptyStateCell}>
                <div>{t('dataTable.noRowsTitle')}</div>
                <div class={styles.emptyStateHint}>{t('dataTable.noRowsSubtitle')}</div>
              </td>
            </tr>
          ) : (
            getPaginatedData().map((row, rowIndex) => {
              const absoluteIndex = pageOffset + rowIndex;
              const isRowSelected = selectedRows.value.includes(absoluteIndex);

              return (
                <tr
                  key={`${contextKey}-${rowIndex}`}
                  class={`${styles.dataTable__row} ${row._removed ? styles.removed : ''} ${row._duplicate ? styles.duplicate : ''} ${isRowSelected ? styles.selectedRow : ''}`}
                  aria-selected={isRowSelected || undefined}
                >
                  <td
                    class={`${styles.rowGutterCell} ${isRowSelected ? styles.rowGutterSelected : ''}`}
                    data-row-gutter="true"
                    tabIndex={rowIndex === 0 ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRow(absoluteIndex, e as unknown as MouseEvent);
                    }}
                    onKeyDown={(e) =>
                      handleGutterKeyDown(absoluteIndex, e as unknown as KeyboardEvent)
                    }
                  >
                    {absoluteIndex + 1}
                  </td>
                  {columns.value.map((column) => {
                    const cellValue = row[column];
                    const isError = isConversionError(cellValue);
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
                          onSelectCell(column, cellValue, rowIndex, e as unknown as MouseEvent);
                        }}
                      >
                        {isError ? (
                          <span class={styles.errorCell}>
                            <span
                              class="iconify"
                              aria-hidden="true"
                              data-icon="carbon:warning-filled"
                            ></span>
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
