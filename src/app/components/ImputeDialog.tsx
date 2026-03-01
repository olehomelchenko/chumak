import { useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { updateImputePreview } from '../handlers/transform/simple-handlers';
import styles from './TransformDialog.module.css';

/**
 * ImputeDialog
 *
 * UI for filling missing values (null, NaN) using various strategies.
 */
export function ImputeDialog() {
  const state = DialogStore.imputeState;
  const columns = AppStore.columns.value;
  const model = AppStore.activeModel.value;
  const schema = model?.schema || [];

  // Reactive preview update
  useSignalEffect(() => {
    state.column.value;
    state.strategy.value;
    state.value.value;
    state.includeEmptyString.value;
    updateImputePreview();
  });

  const selectedColSchema = schema.find((s) => s.name === state.column.value);
  const isNumeric = selectedColSchema?.type === 'integer' || selectedColSchema?.type === 'float';

  const strategies = [
    // Row 1
    {
      id: 'constant',
      label: 'Constant',
      icon: 'material-symbols:format-quote-rounded',
      numericOnly: false,
    },
    { id: 'mean', label: 'Mean', icon: 'material-symbols:average-rounded', numericOnly: true },
    {
      id: 'min',
      label: 'Min',
      icon: 'material-symbols:vertical-align-bottom-rounded',
      numericOnly: true,
    },
    {
      id: 'forwardFill',
      label: 'Forward Fill',
      icon: 'material-symbols:arrow-downward-rounded',
      numericOnly: false,
    },
    // Row 2
    {
      id: 'linearInterpolation',
      label: 'Linear',
      icon: 'material-symbols:show-chart-rounded',
      numericOnly: true,
    },
    {
      id: 'median',
      label: 'Median',
      icon: 'material-symbols:equalizer-rounded',
      numericOnly: true,
    },
    {
      id: 'max',
      label: 'Max',
      icon: 'material-symbols:vertical-align-top-rounded',
      numericOnly: true,
    },
    {
      id: 'backwardFill',
      label: 'Backward Fill',
      icon: 'material-symbols:arrow-upward-rounded',
      numericOnly: false,
    },
  ];

  const handleColumnChange = (e: any) => {
    state.column.value = e.target.value;
  };

  const handleStrategyChange = (id: string) => {
    state.strategy.value = id as any;
  };

  const handleValueChange = (e: any) => {
    state.value.value = e.target.value;
  };

  return (
    <div className={styles.dialogContent}>
      <div className={styles.group}>
        <label className={styles.label}>Column to Impute</label>
        <select className={styles.input} value={state.column.value} onChange={handleColumnChange}>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '4px',
          }}
        >
          <p className={styles.helpText}>Select the column containing missing values.</p>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--color-dark-gray)',
              background: 'var(--color-light-gray)',
              padding: '2px 4px',
              borderRadius: '3px',
            }}
          >
            Type: {selectedColSchema?.type || 'unknown'}
          </span>
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Imputation Strategy</label>
        <div className={styles.chipGrid4}>
          {strategies.map((s) => {
            const disabled = s.numericOnly && !isNumeric;
            return (
              <div
                key={s.id}
                className={`${styles.chip} ${state.strategy.value === s.id ? styles.active : ''} ${disabled ? styles.unselected : ''}`}
                onClick={() => !disabled && handleStrategyChange(s.id)}
                title={disabled ? 'This strategy requires a numeric column' : ''}
                style={{
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <span className={`iconify ${styles.chipIcon}`} data-icon={s.icon} />
                <span style={{ fontSize: '11px', textAlign: 'center' }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {(state.strategy.value === 'forwardFill' ||
        state.strategy.value === 'backwardFill' ||
        state.strategy.value === 'linearInterpolation') && (
        <p className={styles.helpText} style={{ marginTop: 0 }}>
          Tip: This strategy is order-dependent. Consider adding a Sort step before this one to
          ensure rows are in the expected order.
        </p>
      )}

      <div className={styles.group}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={state.includeEmptyString.value}
            onChange={(e) => (state.includeEmptyString.value = e.currentTarget.checked)}
          />
          <span>Include empty strings ("") as missing</span>
        </label>
        <p className={styles.helpText} style={{ marginLeft: '24px' }}>
          By default, only <code>null</code>, <code>undefined</code>, and <code>NaN</code> are
          considered missing.
        </p>
      </div>

      {state.strategy.value === 'constant' && (
        <div className={styles.group}>
          <label className={styles.label}>Replacement Value</label>
          <input
            type="text"
            className={styles.input}
            value={state.value.value}
            onInput={handleValueChange}
            placeholder="Enter value (e.g. 0, N/A, Unknown)"
            autoFocus
          />
          <p className={styles.helpText}>Missing values will be replaced by this value.</p>
        </div>
      )}

      {state.previewRows.value && (
        <div className={styles.group}>
          <label className={styles.label}>Strategy Preview (Example Data)</label>
          <div className={styles.previewScroll}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Original</th>
                  <th>Imputed</th>
                </tr>
              </thead>
              <tbody>
                {state.previewRows.value.map((row) => (
                  <tr key={row._index}>
                    <td style={{ color: 'var(--color-dark-gray)' }}>{row._index + 1}</td>
                    <td
                      style={{
                        color:
                          row.original === null || row.original === ''
                            ? 'var(--color-dark-red)'
                            : 'inherit',
                        fontStyle:
                          row.original === null || row.original === '' ? 'italic' : 'normal',
                      }}
                    >
                      {row.original === null
                        ? 'null'
                        : row.original === ''
                          ? '""'
                          : String(row.original)}
                    </td>
                    <td
                      style={{
                        backgroundColor: row.isImputed
                          ? 'rgba(var(--color-cyan-rgb), 0.1)'
                          : 'transparent',
                        fontWeight: row.isImputed ? '600' : '400',
                        color: row.isImputed ? 'var(--color-cyan)' : 'inherit',
                      }}
                    >
                      {row.imputed === null ? 'null' : String(row.imputed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state.error.value && (
        <div className={styles.error}>
          <span className="iconify" data-icon="material-symbols:error-outline-rounded" />
          <span>{state.error.value}</span>
        </div>
      )}
    </div>
  );
}
