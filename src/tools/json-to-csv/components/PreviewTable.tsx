import { useTranslation } from 'preact-i18next';
import { rawJson, previewRows, headers, totalRows, processedData } from '../state';
import tableStyles from '../../../app/components/DataTable.module.css';
import styles from '../JsonToCsv.module.css';

export function PreviewTable() {
  const { t } = useTranslation('tools');
  const rows = previewRows.value;
  const cols = headers.value;
  const total = totalRows.value;
  const { warning } = processedData.value;
  const hasData = rawJson.value !== null;

  if (!hasData || cols.length === 0) {
    return <div class={styles.previewPlaceholder}>{t('jsonToCsv.preview.placeholder')}</div>;
  }

  return (
    <>
      <div class={styles.previewHeader}>
        <div class={styles.previewTitle}>{t('jsonToCsv.preview.title')}</div>
        <div class={styles.previewMeta}>
          {t('jsonToCsv.preview.showing', { count: rows.length, total })}
          {' \u00B7 '}
          {t('jsonToCsv.preview.columns', { count: cols.length })}
        </div>
      </div>

      {warning && <div class={styles.warning}>{warning}</div>}

      <div class={tableStyles.tableContainer} style={{ maxHeight: '400px' }}>
        <table class={`${tableStyles.dataTable} ${tableStyles.compact}`}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col} class={tableStyles.dataTable__header}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} class={tableStyles.dataTable__row}>
                {cols.map((col) => (
                  <td key={col} class={tableStyles.cell}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
