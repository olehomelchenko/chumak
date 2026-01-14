import { Signal } from '@preact/signals';
import { JSX } from 'preact';

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross';

export interface JoinTarget {
  id: string;
  name: string;
  type: 'model' | 'source';
  sourceName?: string;
}

export interface JoinDialogProps {
  targets: JoinTarget[];
  rightModel: Signal<string | null>;
  joinType: Signal<JoinType>;
  keyPairs: Signal<(string | null)[][]>;
  suffixes: Signal<string[]>;
  leftColumns: string[];
  rightColumns: Signal<string[]>;
  previewData: Signal<any | null>;
  previewError: Signal<string | null>;
  isPreviewing: Signal<boolean>;
  onPreview: () => void;
}

export function JoinDialog({
  targets,
  rightModel,
  joinType,
  keyPairs,
  suffixes,
  leftColumns,
  rightColumns,
  previewData,
  previewError,
  isPreviewing,
  onPreview,
}: JoinDialogProps) {
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

  return (
    <div className="dialog-content">
      {/* Join With */}
      <div className="form-group">
        <label className="form-label" htmlFor="join-target-select">
          Join With
        </label>
        <select
          id="join-target-select"
          className="form-input"
          value={rightModel.value || ''}
          onChange={handleTargetChange}
        >
          <option value="" disabled>
            Select model or source...
          </option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {`${target.name} (${target.type === 'model' ? 'model' : 'source'}${
                target.sourceName ? ` - ${target.sourceName}` : ''
              })`}
            </option>
          ))}
        </select>
        {targets.length === 0 && (
          <div className="form-help" style={{ color: 'var(--color-error)' }}>
            No other models or sources available. Create another model or import another dataset
            first.
          </div>
        )}
      </div>

      {/* Join Type */}
      <div className="form-group">
        <label className="form-label">Join Type</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['inner', 'left', 'right', 'full', 'cross'] as JoinType[]).map((type) => (
            <label key={type} className="radio-label">
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
        <div className="form-help">
          {joinType.value === 'inner' && 'Keep only rows that match in both tables'}
          {joinType.value === 'left' && 'Keep all rows from left table, matching rows from right'}
          {joinType.value === 'right' && 'Keep all rows from right table, matching rows from left'}
          {joinType.value === 'full' && 'Keep all rows from both tables'}
          {joinType.value === 'cross' && 'Cartesian product (all combinations)'}
        </div>
      </div>

      {/* Join Keys */}
      {joinType.value !== 'cross' && (
        <div className="form-group">
          <label className="form-label">Join Keys</label>
          {keyPairs.value.map((pair, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                alignItems: 'center',
              }}
            >
              <select
                className="form-input"
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
                className="form-input"
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
                className="button button--secondary button--small"
                onClick={() => removeKeyPair(index)}
                disabled={keyPairs.value.length === 1}
                title="Remove key pair"
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="button button--secondary button--small"
            onClick={addKeyPair}
            style={{ marginTop: '0.5rem' }}
          >
            + Add Key Pair
          </button>
          <div className="form-help">Match rows where these columns have equal values</div>
        </div>
      )}

      {/* Column Suffixes */}
      <div className="form-group">
        <label className="form-label">Column Name Suffixes (for conflicts)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={suffixes.value[0]}
            onInput={(e) => handleSuffixChange(0, e.currentTarget.value)}
            placeholder="_x"
          />
          <span>/</span>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={suffixes.value[1]}
            onInput={(e) => handleSuffixChange(1, e.currentTarget.value)}
            placeholder="_y"
          />
        </div>
        <div className="form-help">Applied to left/right columns when names conflict</div>
      </div>

      {/* Preview Button */}
      <div className="form-group">
        <button
          className="button button--secondary"
          onClick={onPreview}
          disabled={isPreviewing.value || !rightModel.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Join'}
        </button>
      </div>

      {/* Preview Error */}
      {previewError.value && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>
          <strong>Preview Error:</strong>
          <div>{previewError.value}</div>
        </div>
      )}

      {/* Preview Results */}
      {previewData.value && (
        <div className="form-group">
          <div
            style={{
              padding: '1rem',
              background: 'var(--color-light-gray)',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
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

          <div
            style={{
              maxHeight: '300px',
              overflow: 'auto',
              border: '1px solid var(--color-medium-gray)',
              borderRadius: '4px',
            }}
          >
            <table className="data-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  {previewData.value.columns?.map((col: string) => (
                    <th key={col} className="data-table__header">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.value.rows?.map((row: any, idx: number) => (
                  <tr key={idx}>
                    {previewData.value.columns?.map((col: string) => (
                      <td key={col} className="data-table__cell">
                        {row[col]}
                      </td>
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
