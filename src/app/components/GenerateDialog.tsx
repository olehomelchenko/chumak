import { useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { GeneratorService, GeneratorType } from '../services/GeneratorService';
import * as GenerateHandlers from '../handlers/generate-handlers';
import styles from './TransformDialog.module.css';

const generatorIcons: Record<GeneratorType, string> = {
  numberSequence: 'carbon:list-number',
  dateSequence: 'carbon:calendar',
  randomNumber: 'carbon:help',
  randomDate: 'carbon:calendar-tools',
  randomBoolean: 'carbon:boolean',
  randomCategory: 'carbon:direction-loop',
};

const generatorLabels: Record<GeneratorType, string> = {
  numberSequence: 'Number Sequence',
  dateSequence: 'Date Sequence',
  randomNumber: 'Random Number',
  randomDate: 'Random Date',
  randomBoolean: 'Random Boolean',
  randomCategory: 'Random Category',
};

export function GenerateDialog() {
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

  const renderConfigFields = () => {
    const t = type.value as GeneratorType;
    const cfg = config.value;

    if (t === 'numberSequence') {
      return (
        <div class={styles.configGrid}>
          <div class={styles.flex15}>
            <label class={styles.label}>Start *</label>
            <input
              type="text"
              inputmode="decimal"
              class={styles.input}
              value={cfg.start}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                  updateConfig({ start: val || '0' });
                }
              }}
              placeholder="0"
            />
          </div>
          <div class={styles.flex15}>
            <label class={styles.label}>Stop *</label>
            <input
              type="text"
              inputmode="decimal"
              class={styles.input}
              value={cfg.stop === undefined ? '' : cfg.stop}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                  updateConfig({ stop: val === '' ? undefined : val });
                }
              }}
              placeholder="e.g. 10.5"
            />
          </div>
          <div class={styles.flex15}>
            <label class={styles.label}>Step (opt)</label>
            <input
              type="text"
              inputmode="decimal"
              class={styles.input}
              value={cfg.step || ''}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                  updateConfig({ step: val || '1' });
                }
              }}
              placeholder="1"
            />
          </div>
          <div class={styles.flex1}>
            <label class={styles.label}>Decimals</label>
            <input
              type="number"
              class={styles.input}
              value={cfg.decimals}
              min="0"
              max="10"
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                updateConfig({ decimals: val === '' ? 0 : parseInt(val) || 0 });
              }}
            />
          </div>
        </div>
      );
    }

    if (t === 'dateSequence') {
      return (
        <>
          <div class={styles.configGrid}>
            <div class={styles.flex1}>
              <label class={styles.label}>Start Date *</label>
              <input
                type="text"
                class={styles.input}
                value={cfg.start}
                onInput={(e) => updateConfig({ start: (e.target as HTMLInputElement).value })}
                placeholder="YYYY-MM-DD HH:mm:ss"
              />
            </div>
            <div class={styles.flex1}>
              <label class={styles.label}>Stop Date *</label>
              <input
                type="text"
                class={styles.input}
                value={cfg.stop}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateConfig({ stop: val === '' ? undefined : val });
                }}
                placeholder="YYYY-MM-DD HH:mm:ss"
              />
            </div>
            <div class={styles.flex1}>
              <label class={styles.label}>Step (opt)</label>
              <input
                type="number"
                class={styles.input}
                value={cfg.increment || ''}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateConfig({ increment: val === '' ? 1 : parseInt(val) || 1 });
                }}
                placeholder="1"
              />
            </div>
          </div>
          <div class={styles.group} style={{ marginTop: '0.75rem' }}>
            <label class={styles.label}>Unit</label>
            <div class={styles.unitSelect}>
              {['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'].map((unit) => (
                <label key={unit} class={styles.radioLabel} style={{ padding: '0.25rem 0.75rem' }}>
                  <input
                    type="radio"
                    name="unit"
                    value={unit}
                    checked={cfg.unit === unit}
                    onChange={() => updateConfig({ unit })}
                    style={{ display: 'none' }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{unit}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (t === 'randomNumber') {
      return (
        <div class={styles.configGrid}>
          <div class={styles.flex1}>
            <label class={styles.label}>Min</label>
            <input
              type="text"
              inputmode="decimal"
              class={styles.input}
              value={cfg.min}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                  updateConfig({ min: val || '0' });
                }
              }}
            />
          </div>
          <div class={styles.flex1}>
            <label class={styles.label}>Max</label>
            <input
              type="text"
              inputmode="decimal"
              class={styles.input}
              value={cfg.max}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                  updateConfig({ max: val || '100' });
                }
              }}
            />
          </div>
          <div class={styles.flex1}>
            <label class={styles.label}>Decimals</label>
            <input
              type="number"
              class={styles.input}
              value={cfg.decimals}
              min="0"
              max="10"
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                updateConfig({ decimals: val === '' ? 0 : parseInt(val) || 0 });
              }}
            />
          </div>
        </div>
      );
    }

    if (t === 'randomDate') {
      return (
        <div class={styles.configGrid}>
          <div class={styles.flex1}>
            <label class={styles.label}>From</label>
            <input
              type="text"
              class={styles.input}
              value={cfg.from}
              onInput={(e) => updateConfig({ from: (e.target as HTMLInputElement).value })}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div class={styles.flex1}>
            <label class={styles.label}>To</label>
            <input
              type="text"
              class={styles.input}
              value={cfg.to}
              onInput={(e) => updateConfig({ to: (e.target as HTMLInputElement).value })}
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>
      );
    }

    if (t === 'randomBoolean') {
      return (
        <div class={styles.group}>
          <label class={styles.label}>True Probability (0-1)</label>
          <input
            type="text"
            inputmode="decimal"
            class={styles.input}
            value={cfg.trueProbability}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                updateConfig({
                  trueProbability: val === '' ? 0.5 : val,
                });
              }
            }}
          />
        </div>
      );
    }

    if (t === 'randomCategory') {
      return (
        <div class={styles.group}>
          <label class={styles.label}>Values (comma-separated)</label>
          <input
            type="text"
            class={styles.input}
            value={cfg.values.join(', ')}
            onInput={(e) => {
              const values = (e.target as HTMLInputElement).value
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v !== '');
              updateConfig({ values });
            }}
            placeholder="A, B, C"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      {/* Row 1: Source Name | Column Name */}
      <div class={styles.flexRow} style={{ marginBottom: '1rem' }}>
        <div class={styles.flex1}>
          <label class={styles.label}>Source Name</label>
          <input
            type="text"
            class={styles.input}
            value={sourceName.value}
            onInput={(e) => (sourceName.value = (e.target as HTMLInputElement).value)}
            placeholder="generated_data"
          />
        </div>
        <div class={styles.flex1}>
          <label class={styles.label}>Column Name</label>
          <input
            type="text"
            class={styles.input}
            value={columnName.value}
            onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
            placeholder="id"
          />
        </div>
      </div>

      {/* Row 2: Generator Type Selection (Chips) */}
      <div class={styles.group}>
        <label class={styles.label}>Generator Type</label>
        <div class={styles.grid3} style={{ marginBottom: '1rem' }}>
          {(
            [
              'numberSequence',
              'dateSequence',
              'randomNumber',
              'randomDate',
              'randomBoolean',
              'randomCategory',
            ] as GeneratorType[]
          ).map((t) => (
            <label key={t} class={styles.radioLabelCentered}>
              <input
                type="radio"
                name="generatorType"
                value={t}
                checked={type.value === t}
                onChange={() => handleTypeChange(t)}
                style={{ display: 'none' }}
              />
              <span
                class="iconify"
                data-icon={generatorIcons[t]}
                style={{ fontSize: '16px' }}
              ></span>
              <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {generatorLabels[t]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Row 3: Config Fields */}
      <div class={styles.configBox}>{renderConfigFields()}</div>

      {/* Row 4: Number of Rows */}
      <div class={styles.group}>
        <div class={styles.rowHeader}>
          <label class={styles.label}>Number of Rows</label>
          <label class={styles.autoLabel}>
            <input
              type="checkbox"
              checked={isRowAuto.value}
              onChange={(e) => (isRowAuto.value = (e.target as HTMLInputElement).checked)}
            />
            Auto-calculate
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
          placeholder="100"
          style={
            isRowAuto.value ? { opacity: 0.7, backgroundColor: 'var(--color-lighter-gray)' } : {}
          }
        />
        <p class={styles.helpText}>
          {isRowAuto.value
            ? calculatedRows !== null
              ? `Calculated ${calculatedRows.toLocaleString()} rows`
              : 'Add a sequence with a "Stop" value to calculate rows'
            : 'Maximum: 100,000 rows'}
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
