import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

/**
 * SampleDialog component
 * Allows users to take a random sample of rows with optional seed
 */
export function SampleDialog() {
  const { count, seed } = DialogStore.sampleState;
  const currentData = AppStore.currentData.value;
  const totalRows = currentData ? currentData.length : 0;

  return (
    <div class={styles.formSection}>
      <div class={styles.group}>
        <label class={styles.label} htmlFor="sample-count">
          Sample Size
        </label>
        <input
          id="sample-count"
          type="number"
          class={styles.input}
          value={count.value}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            count.value = isNaN(val) ? 0 : val;
          }}
          min="1"
          max={totalRows}
        />
        <div class={styles.helpText}>Total available rows: {totalRows.toLocaleString()}</div>
      </div>

      <div class={styles.group}>
        <label class={styles.label} htmlFor="sample-seed">
          Random Seed (Optional)
        </label>
        <input
          id="sample-seed"
          type="number"
          class={styles.input}
          value={seed.value ?? ''}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            seed.value = isNaN(val) ? undefined : val;
          }}
          placeholder="Enter a number for reproducible sampling"
        />
        <div class={styles.helpText}>
          Use a seed to get the same "random" sample every time you run this step.
        </div>
      </div>

      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>How it works</div>
        <div class={styles.helpText} style={{ color: 'var(--color-midnight-blue)' }}>
          Sampling extracts a subset of rows randomly. To ensure your results are
          <strong> fully reproducible</strong>, a random seed will be auto-generated if you leave
          the field blank.
        </div>
      </div>
    </div>
  );
}
