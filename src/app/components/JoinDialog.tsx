import { JSX } from 'preact';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross';

export interface JoinTarget {
  id: string;
  name: string;
  type: 'model' | 'source';
  sourceName?: string;
}

// Props interface kept for reference/testing
export interface JoinDialogProps {
  targets?: JoinTarget[];
  leftColumns?: string[];
  onPreview?: () => void;
}

export function JoinDialog({ onPreview }: JoinDialogProps = {}) {
  const {
    rightModel,
    joinType,
    keyPairs,
    suffixes,
    targets,
    rightColumns,
    previewData,
    previewError,
    isPreviewing,
  } = DialogStore.joinState;

  const leftColumns = AppStore.columns.value;

  const handleTargetChange = (e: JSX.TargetedEvent<HTMLSelectElement>) => {
    rightModel.value = e.currentTarget.value || null;
  };

  const handleJoinTypeChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    joinType.value = e.currentTarget.value as JoinType;
  };

  const handleSuffixChange = (index: number, value: string) => {
    const newSuffixes = [...suffixes.value];
    newSuffixes[index] = value;
    suffixes.value = newSuffixes;
  };

  const addKeyPair = () => {
    keyPairs.value = [...keyPairs.value, [null, null]];
  };

  const removeKeyPair = (index: number) => {
    if (keyPairs.value.length <= 1) return;
    keyPairs.value = keyPairs.value.filter((_, i) => i !== index);
  };

  const updateKeyPair = (index: number, position: 0 | 1, value: string | null) => {
    const newPairs = keyPairs.value.map((pair, i) => {
      if (i === index) {
        const newPair = [...pair];
        newPair[position] = value;
        return newPair;
      }
      return pair;
    });
    keyPairs.value = newPairs;
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview();
    }
  };

  return (
    <div>
      {/* Join With */}
      <div class={styles.group}>
        <label class={styles.label} for="join-target-select">
          Join With
        </label>
        <select
          id="join-target-select"
          class={styles.input}
          value={rightModel.value || ''}
          onChange={handleTargetChange}
        >
          <option value="" disabled>
            Select model or source...
          </option>
          {targets.value.map((target) => (
            <option key={target.id} value={target.id}>
              {`${target.name} (${target.type === 'model' ? 'model' : 'source'}${
                target.sourceName ? ` - ${target.sourceName}` : ''
              })`}
            </option>
          ))}
        </select>
        {targets.value.length === 0 && (
          <div class={styles.error}>
            No other models or sources available. Create another model or import another dataset
            first.
          </div>
        )}
      </div>

      {/* Join Type */}
      <div class={styles.group}>
        <label class={styles.label}>Join Type</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['inner', 'left', 'right', 'full', 'cross'] as JoinType[]).map((type) => (
            <label key={type} class={styles.radioLabel}>
              <input
                type="radio"
                name="joinType"
                value={type}
                checked={joinType.value === type}
                onChange={handleJoinTypeChange}
              />
              <span style={{ textTransform: 'capitalize' }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </label>
          ))}
        </div>
        <div class={styles.helpText}>
          {joinType.value === 'inner' && 'Keep only rows that match in both tables'}
          {joinType.value === 'left' && 'Keep all rows from left table, matching rows from right'}
          {joinType.value === 'right' && 'Keep all rows from right table, matching rows from left'}
          {joinType.value === 'full' && 'Keep all rows from both tables'}
          {joinType.value === 'cross' && 'Cartesian product (all combinations)'}
        </div>
      </div>

      {/* Join Keys */}
      {joinType.value !== 'cross' && (
        <div class={styles.group}>
          <label class={styles.label}>Join Keys</label>
          {keyPairs.value.map((pair, index) => (
            <div key={index} class={styles.keyGrid}>
              <select
                class={styles.input}
                style={{ flex: 1 }}
                value={pair[0] || ''}
                onChange={(e) => updateKeyPair(index, 0, e.currentTarget.value || null)}
              >
                <option value="">Select left column...</option>
                {leftColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <span>=</span>
              <select
                class={styles.input}
                style={{ flex: 1 }}
                value={pair[1] || ''}
                onChange={(e) => updateKeyPair(index, 1, e.currentTarget.value || null)}
              >
                <option value="">Select right column...</option>
                {rightColumns.value.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <button
                class="button button--secondary button--small"
                onClick={() => removeKeyPair(index)}
                disabled={keyPairs.value.length === 1}
                title="Remove key pair"
              >
                ×
              </button>
            </div>
          ))}
          <button class="button button--secondary button--small" onClick={addKeyPair}>
            + Add Key Pair
          </button>
          <div class={styles.helpText}>Match rows where these columns have equal values</div>
        </div>
      )}

      {/* Column Suffixes */}
      <div class={styles.group}>
        <label class={styles.label}>Column Name Suffixes (for conflicts)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            class={styles.input}
            style={{ flex: 1 }}
            value={suffixes.value[0]}
            onInput={(e) => handleSuffixChange(0, e.currentTarget.value)}
            placeholder="_x"
          />
          <span>/</span>
          <input
            type="text"
            class={styles.input}
            style={{ flex: 1 }}
            value={suffixes.value[1]}
            onInput={(e) => handleSuffixChange(1, e.currentTarget.value)}
            placeholder="_y"
          />
        </div>
        <div class={styles.helpText}>Applied to left/right columns when names conflict</div>
      </div>

      {/* Preview Button */}
      <div class={styles.group}>
        <button
          class="button button--secondary"
          onClick={handlePreview}
          disabled={isPreviewing.value || !rightModel.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Join'}
        </button>
      </div>

      {/* Preview Error */}
      {previewError.value && <div class={styles.error}>{previewError.value}</div>}

      {/* Preview Results */}
      {previewData.value && (
        <div class={styles.group}>
          <div class={styles.previewContainer}>
            <strong>Preview Result:</strong>
            <div>
              {`${previewData.value.totalRows || 0} rows, ${
                previewData.value.columns?.length || 0
              } columns`}
            </div>
            <div
              style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', marginTop: '0.5rem' }}
            >
              Showing first 100 rows
            </div>
          </div>

          <div class={styles.previewScroll}>
            <table class={styles.previewTable}>
              <thead>
                <tr>
                  {previewData.value.columns?.map((col: string) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.value.rows?.map((row: any, idx: number) => (
                  <tr key={idx}>
                    {previewData.value.columns?.map((col: string) => (
                      <td key={col}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
