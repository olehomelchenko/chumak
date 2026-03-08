import { useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { GeneratorService, GeneratorType } from '../services/GeneratorService';
import { GeneratorTypeSelector, GeneratorConfigEditor } from './generate';
import * as GenerateHandlers from '../handlers/import/generate-handlers';
import formStyles from './form-controls.module.css';
import genStyles from './GenerateDialog.module.css';
const styles = { ...formStyles, ...genStyles };

export function GenerateDialog() {
  const { t } = useTranslation('dialogs');
  const { sourceName, rowCount, isRowAuto, columnName, type, config, error } =
    DialogStore.generateState;

  useSignalEffect(() => {
    // Subscribe to all changes that affect preview
    void rowCount.value;
    void isRowAuto.value;
    void columnName.value;
    void type.value;
    void config.value;

    GenerateHandlers.debouncedUpdateGeneratePreview();
  });

  // Single generator object for service compatibility
  const currentGenerator = {
    name: columnName.value,
    type: type.value as GeneratorType,
    config: config.value,
  };

  // Effect to update row count if Auto is enabled
  const calculatedRows = GeneratorService.calculateRowCount([currentGenerator as any]);
  if (isRowAuto.value && calculatedRows !== null && calculatedRows !== rowCount.value) {
    rowCount.value = calculatedRows;
  }

  const handleTypeChange = (newType: GeneratorType) => {
    type.value = newType;
    config.value = GeneratorService.getDefaultConfig(newType);
    error.value = null;
  };

  const updateConfig = (updates: any) => {
    config.value = { ...config.value, ...updates };
    error.value = null;
  };

  return (
    <div>
      {/* Row 1: Source Name | Column Name */}
      <div class={styles.flexRow} style={{ marginBottom: '1rem' }}>
        <div class={styles.flex1}>
          <label class={styles.label}>{t('generate.sourceNameLabel')}</label>
          <input
            type="text"
            class={styles.input}
            value={sourceName.value}
            onInput={(e) => (sourceName.value = (e.target as HTMLInputElement).value)}
            placeholder={t('generate.sourceNamePlaceholder')}
          />
        </div>
        <div class={styles.flex1}>
          <label class={styles.label}>{t('generate.columnNameLabel')}</label>
          <input
            type="text"
            class={styles.input}
            value={columnName.value}
            onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
            placeholder={t('generate.columnNamePlaceholder')}
          />
        </div>
      </div>

      {/* Row 2: Generator Type Selection */}
      <GeneratorTypeSelector type={type} onChange={handleTypeChange} />

      {/* Row 3: Config Fields */}
      <div class={styles.configBox}>
        <GeneratorConfigEditor
          type={type.value as GeneratorType}
          config={config.value}
          onUpdate={updateConfig}
        />
      </div>

      {/* Row 4: Number of Rows */}
      <div class={styles.group}>
        <div class={styles.rowHeader}>
          <label class={styles.label}>{t('generate.rowCountLabel')}</label>
          <label class={styles.autoLabel}>
            <input
              type="checkbox"
              checked={isRowAuto.value}
              onChange={(e) => (isRowAuto.value = (e.target as HTMLInputElement).checked)}
            />
            {t('generate.autoCalculate')}
          </label>
        </div>
        <input
          type="number"
          class={styles.input}
          value={rowCount.value}
          disabled={isRowAuto.value}
          onInput={(e) => (rowCount.value = parseInt((e.target as HTMLInputElement).value) || 100)}
          min="1"
          max="100000"
          placeholder={t('generate.rowCountPlaceholder')}
          style={
            isRowAuto.value ? { opacity: 0.7, backgroundColor: 'var(--color-lighter-gray)' } : {}
          }
        />
        <p class={styles.helpText}>
          {isRowAuto.value
            ? calculatedRows !== null
              ? t('generate.rowCountHelp.auto').replace(
                  '{{count}}',
                  calculatedRows.toLocaleString()
                )
              : t('generate.rowCountHelp.autoNeed')
            : t('generate.rowCountHelp.manual')}
        </p>
      </div>

      {error.value && (
        <div class={styles.error}>
          <span class="iconify" data-icon="carbon:warning"></span>
          <span>{error.value}</span>
        </div>
      )}
    </div>
  );
}
