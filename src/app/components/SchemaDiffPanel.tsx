import { SchemaDiff } from '../../core/schema-engine';
import styles from './SchemaDiffPanel.module.css';

interface SchemaDiffPanelProps {
  diff: SchemaDiff;
}

export const SchemaDiffPanel = ({ diff }: SchemaDiffPanelProps) => {
  const hasChanges =
    diff.missingColumns.length > 0 || diff.newColumns.length > 0 || diff.typeChanges.length > 0;

  if (!hasChanges) {
    return (
      <div class={styles.panel}>
        <div class={styles.title}>
          <span
            class="iconify"
            data-icon="carbon:checkmark-filled"
            style={{ color: '#4caf50', fontSize: '20px' }}
          ></span>
          <span>Schema matches perfectly</span>
        </div>
      </div>
    );
  }

  return (
    <div class={`${styles.panel} ${diff.missingColumns.length > 0 ? styles.danger : ''}`}>
      <div class={styles.title}>
        <span
          class={`iconify ${styles.icon} ${diff.missingColumns.length > 0 ? styles.warning : ''}`}
          data-icon={
            diff.missingColumns.length > 0 ? 'carbon:warning-filled' : 'carbon:information-filled'
          }
          style={{ fontSize: '20px' }}
        ></span>
        <span>
          {diff.missingColumns.length > 0 ? (
            <strong>Schema Changes Detected</strong>
          ) : (
            'Schema Changes Detected'
          )}
        </span>
      </div>

      <div class={styles.grid}>
        {diff.missingColumns.length > 0 && (
          <div class={`${styles.section} ${styles.missing}`}>
            <div class={styles.sectionTitle}>
              <strong>⚠️ Missing Columns (will be removed):</strong>
            </div>
            <div class={styles.chips}>
              {diff.missingColumns.map((col) => (
                <span key={col} class={styles.chip}>
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {diff.newColumns.length > 0 && (
          <div class={`${styles.section} ${styles.new}`}>
            <div class={styles.sectionTitle}>New Columns:</div>
            <div class={styles.chips}>
              {diff.newColumns.map((col) => (
                <span key={col} class={styles.chip}>
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {diff.typeChanges.length > 0 && (
          <div class={`${styles.section} ${styles.typeChange}`}>
            <div class={styles.sectionTitle}>Type Changes:</div>
            <div class={styles.chips}>
              {diff.typeChanges.map((change) => (
                <span key={change.column} class={styles.chip}>
                  {change.column}: <span class={styles.oldType}>{change.oldType}</span>
                  <span
                    class="iconify"
                    data-icon="carbon:arrow-right"
                    style={{ margin: '0 4px', verticalAlign: 'middle' }}
                  ></span>
                  <span class={styles.newType}>{change.newType}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
