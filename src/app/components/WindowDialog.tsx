import { useTranslation } from 'preact-i18next';
import * as WindowHandlers from '../handlers/transform/window-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import formStyles from './form-controls.module.css';
import winStyles from './WindowDialog.module.css';
import aggStyles from './AggregateDialog.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...winStyles, ...aggStyles, ...exprStyles };
import type { WindowFunction, OrderByItem } from '../stores/dialogs/aggregate/window-state';

/** Window functions that require a source column */
const COLUMN_REQUIRED_FUNCTIONS = [
  'lag',
  'lead',
  'first_value',
  'last_value',
  'nth_value',
  'fill_down',
  'fill_up',
];

/** Window functions that use the offset parameter */
const OFFSET_FUNCTIONS = ['lag', 'lead', 'ntile', 'nth_value'];

/** Window functions that can have a default value */
const DEFAULT_VALUE_FUNCTIONS = ['lag', 'lead'];

export function WindowDialog() {
  const { t } = useTranslation('dialogs');
  const { orderBy, partitionBy, windowFunctions, isPreviewing } = DialogStore.windowState;
  const columns = AppStore.columns.value;

  const windowFunctionsList = [
    {
      value: 'row_number',
      label: t('window.functions.row_number'),
      description: t('window.functionDescriptions.row_number'),
    },
    {
      value: 'rank',
      label: t('window.functions.rank'),
      description: t('window.functionDescriptions.rank'),
    },
    {
      value: 'dense_rank',
      label: t('window.functions.dense_rank'),
      description: t('window.functionDescriptions.dense_rank'),
    },
    {
      value: 'lag',
      label: t('window.functions.lag'),
      description: t('window.functionDescriptions.lag'),
    },
    {
      value: 'lead',
      label: t('window.functions.lead'),
      description: t('window.functionDescriptions.lead'),
    },
    {
      value: 'first_value',
      label: t('window.functions.first_value'),
      description: t('window.functionDescriptions.first_value'),
    },
    {
      value: 'last_value',
      label: t('window.functions.last_value'),
      description: t('window.functionDescriptions.last_value'),
    },
    {
      value: 'percent_rank',
      label: t('window.functions.percent_rank'),
      description: t('window.functionDescriptions.percent_rank'),
    },
    {
      value: 'ntile',
      label: t('window.functions.ntile'),
      description: t('window.functionDescriptions.ntile'),
    },
    {
      value: 'fill_down',
      label: t('window.functions.fill_down'),
      description: t('window.functionDescriptions.fill_down'),
    },
    {
      value: 'fill_up',
      label: t('window.functions.fill_up'),
      description: t('window.functionDescriptions.fill_up'),
    },
  ];

  const updateOrderBy = (index: number, field: keyof OrderByItem, value: string) => {
    const newOrderBy = [...orderBy.value];
    newOrderBy[index] = { ...newOrderBy[index], [field]: value };
    orderBy.value = newOrderBy;
  };

  const removeOrderBy = (index: number) => {
    orderBy.value = orderBy.value.filter((_, i) => i !== index);
  };

  const addOrderBy = () => {
    orderBy.value = [...orderBy.value, { field: '', order: 'asc' }];
  };

  const updateWindowFunction = (index: number, field: keyof WindowFunction, value: any) => {
    const newFuncs = [...windowFunctions.value];
    newFuncs[index] = { ...newFuncs[index], [field]: value };

    // Auto-generate output name when function or column changes
    if (field === 'func' || field === 'sourceCol') {
      const wf = newFuncs[index];
      if (!wf.output || wf.output.startsWith('window_')) {
        const funcName = wf.func;
        const colPart = wf.sourceCol ? `_${wf.sourceCol}` : '';
        newFuncs[index].output = `${funcName}${colPart}`;
      }
    }

    windowFunctions.value = newFuncs;
  };

  const removeWindowFunction = (index: number) => {
    windowFunctions.value = windowFunctions.value.filter((_, i) => i !== index);
  };

  const addWindowFunction = () => {
    windowFunctions.value = [
      ...windowFunctions.value,
      { func: 'row_number', sourceCol: '', offset: 1, defaultValue: '', output: '' },
    ];
  };

  return (
    <div>
      {/* Order By Section */}
      <div class={styles.group}>
        <label class={styles.label}>{t('window.orderByLabel')}</label>
        <p class={styles.helpText}>{t('window.orderByHelp')}</p>

        <div style={{ marginBottom: '0.5rem' }}>
          {orderBy.value.map((item, index) => (
            <div key={index} class={styles.aggregationRow}>
              <select
                class={styles.input}
                style={{ flex: 2 }}
                value={item.field}
                onChange={(e) =>
                  updateOrderBy(index, 'field', (e.target as HTMLSelectElement).value)
                }
              >
                <option value="">{t('window.selectColumn')}</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              <select
                class={styles.input}
                style={{ width: '120px' }}
                value={item.order}
                onChange={(e) =>
                  updateOrderBy(index, 'order', (e.target as HTMLSelectElement).value)
                }
              >
                <option value="asc">{t('window.ascending')}</option>
                <option value="desc">{t('window.descending')}</option>
              </select>

              <button
                class="button button--secondary button--small"
                onClick={() => removeOrderBy(index)}
                title={t('window.remove')}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button class="button button--secondary button--small" onClick={addOrderBy}>
          {t('window.addOrderColumn')}
        </button>
      </div>

      {/* Partition By Section */}
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={partitionBy.value}
          onSelectionChange={(selected) => (partitionBy.value = selected as string[])}
          mode="multi"
          display="chip"
          allowSelectAll={false}
          label={t('window.partitionByLabel')}
          helpText={t('window.partitionByHelp')}
        />
      </div>

      {/* Window Functions Section */}
      <div class={styles.group}>
        <label class={styles.label}>{t('window.windowFunctionsLabel')}</label>

        <div style={{ marginBottom: '0.5rem' }}>
          {windowFunctions.value.map((wf, index) => {
            const funcInfo = windowFunctionsList.find((f) => f.value === wf.func);
            const needsColumn = COLUMN_REQUIRED_FUNCTIONS.includes(wf.func);
            const needsOffset = OFFSET_FUNCTIONS.includes(wf.func);
            const needsDefault = DEFAULT_VALUE_FUNCTIONS.includes(wf.func);

            return (
              <div key={index} class={styles.windowRow}>
                <div class={styles.windowRowMain}>
                  {/* Function */}
                  <select
                    class={styles.input}
                    style={{ width: '140px' }}
                    value={wf.func}
                    onChange={(e) =>
                      updateWindowFunction(index, 'func', (e.target as HTMLSelectElement).value)
                    }
                    title={funcInfo?.description}
                  >
                    {windowFunctionsList.map((f) => (
                      <option key={f.value} value={f.value} title={f.description}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Source Column (conditional) */}
                  {needsColumn && (
                    <select
                      class={styles.input}
                      style={{ flex: 1 }}
                      value={wf.sourceCol}
                      onChange={(e) =>
                        updateWindowFunction(
                          index,
                          'sourceCol',
                          (e.target as HTMLSelectElement).value
                        )
                      }
                    >
                      <option value="">{t('window.selectColumn')}</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Offset (conditional) */}
                  {needsOffset && (
                    <input
                      type="number"
                      class={styles.input}
                      style={{ width: '60px' }}
                      value={wf.offset}
                      min={1}
                      onInput={(e) =>
                        updateWindowFunction(
                          index,
                          'offset',
                          parseInt((e.target as HTMLInputElement).value) || 1
                        )
                      }
                      title={
                        wf.func === 'ntile'
                          ? t('window.offsetTitle.ntile')
                          : t('window.offsetTitle.other')
                      }
                      placeholder={
                        wf.func === 'ntile'
                          ? t('window.offsetPlaceholder.ntile')
                          : t('window.offsetPlaceholder.other')
                      }
                    />
                  )}

                  <span>&rarr;</span>

                  {/* Output Name */}
                  <input
                    type="text"
                    class={styles.input}
                    style={{ flex: 1 }}
                    value={wf.output}
                    onInput={(e) =>
                      updateWindowFunction(index, 'output', (e.target as HTMLInputElement).value)
                    }
                    placeholder={t('window.outputPlaceholder')}
                  />

                  <button
                    class="button button--secondary button--small"
                    onClick={() => removeWindowFunction(index)}
                    title={t('window.remove')}
                  >
                    ×
                  </button>
                </div>

                {/* Default value row (conditional) */}
                {needsDefault && (
                  <div class={styles.windowRowExtra}>
                    <label class={styles.smallLabel}>{t('window.defaultValueLabel')}</label>
                    <input
                      type="text"
                      class={styles.input}
                      style={{ width: '120px' }}
                      value={wf.defaultValue}
                      onInput={(e) =>
                        updateWindowFunction(
                          index,
                          'defaultValue',
                          (e.target as HTMLInputElement).value
                        )
                      }
                      placeholder={t('window.defaultValuePlaceholder')}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button class="button button--secondary button--small" onClick={addWindowFunction}>
          {t('window.addWindowFunction')}
        </button>
      </div>

      {/* Inline Help */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>{t('window.help.title')}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-dark-gray)', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 0.5rem' }}>{t('window.help.description')}</p>
          <div class={styles.exampleGrid}>
            <div>
              <code class={styles.exampleCode}>row_number</code>
            </div>
            <div class={styles.exampleDescription}>{t('window.help.row_number')}</div>
            <div>
              <code class={styles.exampleCode}>rank</code>
            </div>
            <div class={styles.exampleDescription}>{t('window.help.rank')}</div>
            <div>
              <code class={styles.exampleCode}>lag / lead</code>
            </div>
            <div class={styles.exampleDescription}>{t('window.help.lagLead')}</div>
            <div>
              <code class={styles.exampleCode}>fill_down</code>
            </div>
            <div class={styles.exampleDescription}>{t('window.help.fill_down')}</div>
          </div>
          <p
            style={{ margin: '0.5rem 0 0', fontStyle: 'italic' }}
            dangerouslySetInnerHTML={{ __html: t('window.help.orderByNote') }}
          />
        </div>
      </div>

      {/* Preview Button */}
      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <button
          class="button button--secondary"
          onClick={WindowHandlers.updateWindowPreview}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? t('window.previewing') : t('window.previewButton')}
        </button>
      </div>
    </div>
  );
}
