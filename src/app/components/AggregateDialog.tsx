import { Signal } from '@preact/signals';

export interface Aggregation {
  col: string;
  func: string;
  output: string;
}

export interface AggregateDialogProps {
  columns: string[];
  groupBy: Signal<string[]>;
  aggregations: Signal<Aggregation[]>;
  onPreview: () => void;
  isPreviewing: Signal<boolean>;
}

export function AggregateDialog({
  columns,
  groupBy,
  aggregations,
  onPreview,
  isPreviewing,
}: AggregateDialogProps) {
  const toggleColumn = (col: string) => {
    if (groupBy.value.includes(col)) {
      groupBy.value = groupBy.value.filter((c) => c !== col);
    } else {
      groupBy.value = [...groupBy.value, col];
    }
  };

  const selectAll = () => {
    groupBy.value = [...columns];
  };

  const selectNone = () => {
    groupBy.value = [];
  };

  const addAggregation = () => {
    aggregations.value = [...aggregations.value, { col: '', func: 'count', output: 'count' }];
  };

  const removeAggregation = (index: number) => {
    aggregations.value = aggregations.value.filter((_, i) => i !== index);
  };

  const updateAggregation = (index: number, field: keyof Aggregation, value: string) => {
    const newAggs = [...aggregations.value];
    const agg = { ...newAggs[index], [field]: value };

    // Auto-update output name if not manually edited?
    // replicating logic: updateAggregateOutputName(index)
    if (field === 'col' || field === 'func') {
      if (agg.func === 'count' && !agg.col) {
        agg.output = 'count';
      } else if (agg.col) {
        agg.output = `${agg.func}_${agg.col}`;
      }
    }

    newAggs[index] = agg;
    aggregations.value = newAggs;
  };

  const aggFunctions = [
    { value: 'count', label: 'Count' },
    { value: 'sum', label: 'Sum' },
    { value: 'mean', label: 'Mean' },
    { value: 'median', label: 'Median' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'distinct', label: 'Distinct' },
    { value: 'stdev', label: 'StDev' },
    { value: 'first', label: 'First' },
    { value: 'last', label: 'Last' },
  ];

  return (
    <div className="dialog-content">
      {/* Group By Section */}
      <div className="form-group">
        <label className="form-label">Group By (Columns)</label>
        <div
          className="form-actions"
          style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}
        >
          <button type="button" className="button button--text button--small" onClick={selectAll}>
            Select All
          </button>
          <button type="button" className="button button--text button--small" onClick={selectNone}>
            Select None
          </button>
        </div>

        <div className="column-chips-multi">
          {columns.map((col) => {
            const isSelected = groupBy.value.includes(col);
            return (
              <button
                key={col}
                type="button"
                className={`form-chip ${isSelected ? 'active' : ''}`}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'start',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                }}
                onClick={() => toggleColumn(col)}
              >
                <div
                  className="iconify"
                  style={{
                    fontSize: '1rem',
                    flexShrink: 0,
                    color: isSelected ? 'var(--color-green)' : 'currentColor',
                    // Simulate icon appearance or use text fallback if iconify not loaded
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected ? '✓' : '☐'}
                </div>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexGrow: 1,
                    textAlign: 'left',
                  }}
                >
                  {col}
                </span>
              </button>
            );
          })}
          {columns.length === 0 && (
            <div style={{ color: '#888', fontSize: '0.8rem' }}>No columns available</div>
          )}
        </div>
        <div className="form-help">Selected columns will define the grouping keys.</div>
      </div>

      {/* Aggregations Section */}
      <div className="form-group">
        <label className="form-label">Summarize / Rollup</label>

        <div style={{ marginBottom: '0.5rem' }}>
          {aggregations.value.map((agg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                alignItems: 'center',
                background: '#f8f9fa',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              {/* Column */}
              <select
                className="form-input"
                style={{ flex: 1 }}
                value={agg.col}
                onChange={(e) => updateAggregation(index, 'col', e.currentTarget.value)}
                disabled={agg.func === 'count'}
              >
                <option value="">{agg.func === 'count' ? '(All rows)' : 'Select column...'}</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Function */}
              <select
                className="form-input"
                style={{ width: '100px' }}
                value={agg.func}
                onChange={(e) => updateAggregation(index, 'func', e.currentTarget.value)}
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
                className="form-input"
                style={{ flex: 1 }}
                value={agg.output}
                onInput={(e) => updateAggregation(index, 'output', e.currentTarget.value)}
                placeholder="Output name (auto-generated)"
              />

              <button
                className="button button--secondary button--small"
                onClick={() => removeAggregation(index)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button className="button button--secondary button--small" onClick={addAggregation}>
          + Add Aggregation
        </button>
      </div>

      {/* Preview Button */}
      <div className="form-group" style={{ marginTop: '1rem' }}>
        <button
          className="button button--secondary"
          onClick={onPreview}
          disabled={isPreviewing.value}
        >
          {isPreviewing.value ? 'Previewing...' : 'Preview Result'}
        </button>
      </div>
    </div>
  );
}
