import { useTranslation } from 'preact-i18next';
import * as DescribeHandlers from '../handlers/transform/describe-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

export function DescribeDialog() {
  const { t } = useTranslation('dialogs');
  const { selectedColumns, isPreviewing } = DialogStore.describeState;
  const columns = AppStore.columns.value;

  return (
    <div>
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={selectedColumns.value}
          onSelectionChange={(selected) => (selectedColumns.value = selected as string[])}
          mode="multi"
          display="chip"
          allowSelectAll={true}
          label={t('describe.columnsLabel')}
          helpText={t('describe.columnsHelp')}
        />
      </div>

      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>{t('describe.help.title')}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-dark-gray)', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 0.5rem' }}>{t('describe.help.description')}</p>

          <strong>{t('describe.help.allTitle')}</strong>
          <div class={styles.exampleGrid}>
            <div>
              <code class={styles.exampleCode}>count</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.countDesc')}</div>
            <div>
              <code class={styles.exampleCode}>unique</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.uniqueDesc')}</div>
          </div>

          <strong>{t('describe.help.numericTitle')}</strong>
          <div class={styles.exampleGrid}>
            <div>
              <code class={styles.exampleCode}>mean</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.meanDesc')}</div>
            <div>
              <code class={styles.exampleCode}>median</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.medianDesc')}</div>
            <div>
              <code class={styles.exampleCode}>stdev</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.stdevDesc')}</div>
            <div>
              <code class={styles.exampleCode}>min / max</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.minMaxDesc')}</div>
          </div>

          <strong>{t('describe.help.categoricalTitle')}</strong>
          <div class={styles.exampleGrid}>
            <div>
              <code class={styles.exampleCode}>top</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.topDesc')}</div>
            <div>
              <code class={styles.exampleCode}>freq</code>
            </div>
            <div class={styles.exampleDescription}>{t('describe.help.freqDesc')}</div>
          </div>
        </div>
      </div>

      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          class="button button--secondary"
          onClick={DescribeHandlers.updateDescribePreview}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? t('describe.previewing') : t('describe.previewButton')}
        </button>
      </div>
    </div>
  );
}
