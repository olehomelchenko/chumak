import { useEffect } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { previewTypeConversion } from '../handlers/core/interaction-handlers';
import {
  getPreviewColumns,
  getPreviewRows,
  formatPreviewCell,
  isNewPreviewColumn,
} from '../orchestration/DialogCoordinator';
import styles from './App.module.css';
import tableStyles from './DataTable.module.css';

interface TypeConversionDialogProps {
  onCancel: () => void;
  onApply: () => void;
}

export function TypeConversionDialog({ onCancel, onApply }: TypeConversionDialogProps) {
  const { t } = useTranslation('dialogs');
  const column = DialogStore.typeConversionState.column.value;
  const targetType = DialogStore.typeConversionState.targetType.value;
  const previewTitle = DialogStore.previewState.title.value;
  const previewStats = DialogStore.previewState.stats.value;
  const hasPreview = DialogStore.previewState.rows.value.length > 0;

  // Update preview when dialog opens or target type changes
  useEffect(() => {
    if (column && targetType) {
      previewTypeConversion(column, targetType);
    }
  }, [column, targetType]);

  const previewColumns = getPreviewColumns();
  const previewRows = getPreviewRows();

  return (
    <div class={styles.centeredModalBackdrop} onClick={onCancel}>
      <div
        class={styles.centeredModal}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '800px', maxWidth: '90vw' }}
      >
        <div class={styles.centeredModalHeader}>
          <h3>{previewTitle || t('typeConversion.title')}</h3>
          <button onClick={onCancel} class={styles.closeButton}>
            ×
          </button>
        </div>
        <div class={styles.centeredModalContent} style={{ padding: '16px' }}>
          {previewStats && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'var(--color-soft-bg)',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
              dangerouslySetInnerHTML={{ __html: previewStats }}
            />
          )}
          {hasPreview ? (
            <div class={tableStyles.tableContainer} style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <table class={tableStyles.dataTable}>
                <thead>
                  <tr>
                    {previewColumns.map((col: string) => (
                      <th
                        key={col}
                        class={`${tableStyles.dataTable__header} ${isNewPreviewColumn(col) ? styles.previewNewCol : ''}`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row: any, i: number) => {
                    const hasError = row._hasError;
                    return (
                      <tr
                        key={i}
                        class={`${tableStyles.dataTable__row} ${hasError ? tableStyles.error : ''}`}
                      >
                        {previewColumns.map((col: string) => {
                          const cellValue = row[col];
                          const isError =
                            cellValue &&
                            typeof cellValue === 'object' &&
                            'type' in cellValue &&
                            cellValue.type === 'error';
                          return (
                            <td
                              key={col}
                              class={`${tableStyles.cell} ${isNewPreviewColumn(col) ? styles.previewNewCol : ''} ${isError ? tableStyles.error : ''}`}
                              title={isError ? cellValue.message : undefined}
                            >
                              {formatPreviewCell(row, col)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-dark-gray)' }}>
              {t('typeConversion.noPreview')}
            </div>
          )}
        </div>
        <div class={styles.centeredModalFooter}>
          <button class="button button--secondary" onClick={onCancel}>
            {t('common.buttons.cancel')}
          </button>
          <button class="button button--primary" onClick={onApply} disabled={!hasPreview}>
            {t('common.buttons.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
