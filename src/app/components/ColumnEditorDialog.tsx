import { Signal } from '@preact/signals';

export interface ColumnEditorItem {
  original: string;
  renamed: string;
  selected: boolean;
}

export interface ColumnEditorChanges {
  removed: string[];
  renamed: { from: string; to: string }[];
  reordered: boolean;
  hasChanges: boolean;
}

export interface ColumnEditorDialogProps {
  mode: Signal<'list' | 'text'>;

  // List Mode
  columns: Signal<ColumnEditorItem[]>;
  patternText: Signal<string>;
  patternMode: Signal<'include' | 'exclude'>;
  patternMatchType: Signal<'prefix' | 'suffix' | 'exact'>;
  draggedIndex: Signal<number | null>;

  // Text Mode
  textSubMode: Signal<'rename' | 'reorder' | 'select'>;
  textValue: Signal<string>;
  textError: Signal<string | null>;

  // Derived / Calculated
  changes: Signal<ColumnEditorChanges>;

  // Callbacks
  onApplyPattern: () => void;
  onSwitchToText: () => void;
  onValidateText: () => void; // Triggered by input in text mode
}

export function ColumnEditorDialog({
  mode,
  columns,
  patternText,
  patternMode,
  patternMatchType,
  draggedIndex,
  textSubMode,
  textValue,
  textError,
  changes,
  onApplyPattern,
  onSwitchToText,
  onValidateText,
}: ColumnEditorDialogProps) {
  const handleDragStart = (_e: DragEvent, index: number) => {
    draggedIndex.value = index;
    // e.dataTransfer!.effectAllowed = 'move'; // Preact TS might need loose null check
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    const fromIndex = draggedIndex.value;
    if (fromIndex !== null && fromIndex !== index) {
      const newCols = [...columns.value];
      const [moved] = newCols.splice(fromIndex, 1);
      newCols.splice(index, 0, moved);
      columns.value = newCols;
    }
    draggedIndex.value = null;
  };

  const toggleSelection = (index: number) => {
    const newCols = [...columns.value];
    newCols[index] = { ...newCols[index], selected: !newCols[index].selected };
    columns.value = newCols;
  };

  const updateRename = (index: number, val: string) => {
    const newCols = [...columns.value];
    newCols[index] = { ...newCols[index], renamed: val };
    columns.value = newCols;
  };

  const selectAll = () => {
    columns.value = columns.value.map((c) => ({ ...c, selected: true }));
  };

  const selectNone = () => {
    columns.value = columns.value.map((c) => ({ ...c, selected: false }));
  };

  return (
    <div className="dialog-content">
      {/* Mode Toggle */}
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`button button--small ${mode.value === 'list' ? 'button--primary' : ''}`}
            onClick={() => (mode.value = 'list')}
          >
            List Mode
          </button>
          <button
            type="button"
            className={`button button--small ${mode.value === 'text' ? 'button--primary' : ''}`}
            onClick={() => {
              mode.value = 'text';
              onSwitchToText(); // Initializes text value
            }}
          >
            Text Mode
          </button>
        </div>
      </div>

      {mode.value === 'list' && (
        <div>
          {/* Pattern Matching */}
          <div
            className="form-group"
            style={{
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <label className="form-label">Pattern Matching (optional):</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                className="form-input"
                value={patternMode.value}
                onChange={(e) => (patternMode.value = e.currentTarget.value as any)}
                style={{ width: '120px' }}
              >
                <option value="include">Select</option>
                <option value="exclude">Deselect</option>
              </select>
              <select
                className="form-input"
                value={patternMatchType.value}
                onChange={(e) => (patternMatchType.value = e.currentTarget.value as any)}
                style={{ width: '140px' }}
              >
                <option value="prefix">Starts with</option>
                <option value="suffix">Ends with</option>
                <option value="exact">Exact match</option>
              </select>
              <input
                type="text"
                className="form-input"
                value={patternText.value}
                onInput={(e) => (patternText.value = e.currentTarget.value)}
                placeholder="e.g., sales_ or _2023"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="button button--small button--primary"
                onClick={onApplyPattern}
                disabled={!patternText.value.trim()}
              >
                Apply
              </button>
            </div>
            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              <button className="button button--text button--small" onClick={selectAll}>
                Select All
              </button>
              <button className="button button--text button--small" onClick={selectNone}>
                Select None
              </button>
            </div>
          </div>

          {/* Column List */}
          <div
            className="column-editor-list"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
          >
            {columns.value.map((item, index) => (
              <div
                key={item.original}
                className={`column-editor-item ${!item.selected ? 'column-editor-item--unselected' : ''} ${draggedIndex.value === index ? 'column-editor-item--dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'grab',
                }}
              >
                {/* Handle */}
                <span
                  style={{
                    fontSize: '1rem',
                    color: 'var(--color-dark-gray)',
                    flexShrink: 0,
                    cursor: 'grab',
                  }}
                >
                  ⋮⋮
                </span>

                {/* Checkbox */}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => toggleSelection(index)}
                >
                  <span
                    style={{
                      fontSize: '1.25rem',
                      color: item.selected ? 'var(--color-green)' : 'var(--color-red)',
                    }}
                  >
                    {item.selected ? '✓' : '✗'}
                  </span>
                </button>

                {/* Original Name */}
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-dark-gray)',
                    minWidth: '100px',
                    flexShrink: 0,
                    textDecoration: !item.selected ? 'line-through' : 'none',
                    opacity: !item.selected ? 0.6 : 1,
                  }}
                >
                  {item.original}
                </span>

                {/* Arrow */}
                {item.selected && (
                  <span
                    style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', flexShrink: 0 }}
                  >
                    →
                  </span>
                )}

                {/* Editable Name */}
                <input
                  type="text"
                  className="form-input"
                  value={item.renamed}
                  disabled={!item.selected}
                  onInput={(e) => updateRename(index, e.currentTarget.value)}
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.875rem',
                    opacity: !item.selected ? 0.4 : 1,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {mode.value === 'text' && (
        <div>
          {/* Sub-mode Selection */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Text Mode Operation:</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {[
                { val: 'rename', label: 'Rename' },
                { val: 'reorder', label: 'Reorder' },
                { val: 'select', label: 'Select' },
              ].map((opt) => (
                <label
                  key={opt.val}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="textSubMode"
                    value={opt.val}
                    checked={textSubMode.value === opt.val}
                    onChange={() => {
                      textSubMode.value = opt.val as any;
                      onSwitchToText(); // Re-init text logic for new sub-mode
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <p className="form-help" style={{ marginBottom: '0.5rem' }}>
            {textSubMode.value === 'rename' && (
              <span>
                Enter new names for each column (one per line, same order). Must have exactly{' '}
                <strong>{columns.value.length}</strong> lines.
              </span>
            )}
            {textSubMode.value === 'reorder' && (
              <span>
                Rearrange column names to change order. Must include all{' '}
                <strong>{columns.value.length}</strong> columns.
              </span>
            )}
            {textSubMode.value === 'select' && (
              <span>Keep only the listed columns. Delete lines to remove columns.</span>
            )}
          </p>

          <textarea
            className="form-input"
            value={textValue.value}
            onInput={(e) => {
              textValue.value = e.currentTarget.value;
              onValidateText();
            }}
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
            placeholder="Enter column names, one per line..."
          ></textarea>

          {textError.value && (
            <div style={{ marginTop: '0.5rem', color: 'var(--color-red)', fontSize: '0.875rem' }}>
              {textError.value}
            </div>
          )}
        </div>
      )}

      {/* Changes Preview */}
      {changes.value.hasChanges && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Changes Preview:</div>

          {/* Removed */}
          {changes.value.removed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-red)' }}>Remove: </span>
              <span>{changes.value.removed.join(', ')}</span>
            </div>
          )}

          {/* Renamed */}
          {changes.value.renamed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-primary)' }}>Rename: </span>
              {changes.value.renamed.map((r) => (
                <span key={r.from} style={{ marginLeft: '0.25rem' }}>{`${r.from} → ${r.to}`}</span>
              ))}
            </div>
          )}

          {/* Reordered */}
          {changes.value.reordered && (
            <div>
              <span style={{ color: 'var(--color-accent)' }}>Column order changed</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
