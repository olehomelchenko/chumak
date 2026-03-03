import { useTranslation } from 'preact-i18next';
import * as AggregateHandlers from '../handlers/transform/aggregate-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

export interface Aggregation {
  col: string;
  func: string;
  output: string;
}

export function AggregateDialog() {
  const { t } = useTranslation('dialogs');
  const { groupBy, aggregations, isPreviewing } = DialogStore.aggregateState;
  const columns = AppStore.columns.value;

  const updateAggregation = (index: number, field: keyof Aggregation, value: string) => {
    const newAggs = [...aggregations.value];
    newAggs[index] = { ...newAggs[index], [field]: value };
    aggregations.value = newAggs;
    AggregateHandlers.updateAggregateOutputName(index);
  };

  const aggFunctions = [
    { value: 'count', label: t('aggregate.functions.count') },
    { value: 'sum', label: t('aggregate.functions.sum') },
    { value: 'mean', label: t('aggregate.functions.mean') },
    { value: 'median', label: t('aggregate.functions.median') },
    { value: 'min', label: t('aggregate.functions.min') },
    { value: 'max', label: t('aggregate.functions.max') },
    { value: 'distinct', label: t('aggregate.functions.distinct') },
    { value: 'stdev', label: t('aggregate.functions.stdev') },
    { value: 'first', label: t('aggregate.functions.first') },
    { value: 'last', label: t('aggregate.functions.last') },
  ];

  return (
    <div>
      {/* Group By Section */}
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={groupBy.value}
          onSelectionChange={(selected) => (groupBy.value = selected as string[])}
          mode="multi"
          display="chip"
          allowSelectAll={true}
          label={t('aggregate.groupByLabel')}
          helpText={t('aggregate.groupByHelp')}
        />
      </div>

      {/* Aggregations Section */}
      <div class={styles.group}>
        <label class={styles.label}>{t('aggregate.summarizeLabel')}</label>

        <div style={{ marginBottom: '0.5rem' }}>
          {aggregations.value.map((agg, index) => (
            <div key={index} class={styles.aggregationRow}>
              {/* Column */}
              <select
                class={styles.input}
                style={{ flex: 1 }}
                value={agg.col}
                onChange={(e) =>
                  updateAggregation(index, 'col', (e.target as HTMLSelectElement).value)
                }
                disabled={agg.func === 'count'}
              >
                <option value="">
                  {agg.func === 'count' ? t('aggregate.allRows') : t('aggregate.selectColumn')}
                </option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Function */}
              <select
                class={styles.input}
                style={{ width: '100px' }}
                value={agg.func}
                onChange={(e) =>
                  updateAggregation(index, 'func', (e.target as HTMLSelectElement).value)
                }
              >
                {aggFunctions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              <span>&rarr;</span>

              {/* Output Name */}
              <input
                type="text"
                class={styles.input}
                style={{ flex: 1 }}
                value={agg.output}
                onInput={(e) =>
                  updateAggregation(index, 'output', (e.target as HTMLInputElement).value)
                }
                placeholder={t('aggregate.outputPlaceholder')}
              />

              <button
                class="button button--secondary button--small"
                onClick={() => AggregateHandlers.removeAggregation(index)}
                title={t('aggregate.remove')}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          class="button button--secondary button--small"
          onClick={AggregateHandlers.addAggregation}
        >
          {t('aggregate.addAggregation')}
        </button>
      </div>

      {/* Inline Help */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>{t('aggregate.help.title')}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-dark-gray)', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 0.5rem' }}>{t('aggregate.help.description')}</p>
          <div class={styles.exampleGrid}>
            <div>
              <code class={styles.exampleCode}>count</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.countDesc')}</div>
            <div>
              <code class={styles.exampleCode}>sum</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.sumDesc')}</div>
            <div>
              <code class={styles.exampleCode}>mean</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.meanDesc')}</div>
            <div>
              <code class={styles.exampleCode}>median</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.medianDesc')}</div>
            <div>
              <code class={styles.exampleCode}>min / max</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.minMaxDesc')}</div>
            <div>
              <code class={styles.exampleCode}>distinct</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.distinctDesc')}</div>
            <div>
              <code class={styles.exampleCode}>stdev</code>
            </div>
            <div class={styles.exampleDescription}>{t('aggregate.help.stdevDesc')}</div>
          </div>
        </div>
      </div>

      {/* Preview Button */}
      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          class="button button--secondary"
          onClick={AggregateHandlers.updateAggregatePreview}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? t('aggregate.previewing') : t('aggregate.previewButton')}
        </button>
      </div>
    </div>
  );
}
