import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { useComputed } from '@preact/signals';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';
import * as Handlers from '../handlers/column-editor-handlers';

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

export function ColumnEditorDialog() {
  const {
    mode,
    columns,
    patternText,
    patternMode,
    patternMatchType,
    textSubMode,
    textValue,
    textError,
  } = DialogStore.columnEditorState;

  // Compute changes using shared logic
  const changes = useComputed<ColumnEditorChanges>(() => {
    return Handlers.getColumnEditorChanges();
  });

  // Adapter functions for ColumnSelector
  const getColumnNames = (): string[] => columns.value.map((item) => item.original);
  const getSelectedColumnNames = (): string[] =>
    columns.value.filter((item) => item.selected).map((item) => item.original);
  const getRenameValues = (): Record<string, string> => {
    const result: Record<string, string> = {};
    columns.value.forEach((item) => {
      result[item.original] = item.renamed;
    });
    return result;
  };

  const handleSelectionChange = (selected: string[] | string) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    const newCols = columns.value.map((item) => ({
      ...item,
      selected: selectedArray.includes(item.original),
    }));
    columns.value = newCols;
  };

  const handleRenameChange = (columnName: string, newName: string) => {
    const index = columns.value.findIndex((item) => item.original === columnName);
    if (index >= 0) {
      const newCols = [...columns.value];
      newCols[index] = { ...newCols[index], renamed: newName };
      columns.value = newCols;
    }
  };

  const handleReorder = (newOrder: string[]) => {
    const reordered = newOrder.map(
      (original) => columns.value.find((item) => item.original === original)!
    );
    columns.value = reordered;
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div class={styles.group}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'list' ? styles.active : ''}`}
            onClick={() => (mode.value = 'list')}
          >
            List Mode
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'text' ? styles.active : ''}`}
            onClick={() => Handlers.switchColumnEditorToText()}
          >
            Text Mode
          </button>
        </div>
      </div>

      {mode.value === 'list' && (
        <div>
          {/* Pattern Matching */}
          <div
            class={styles.group}
            style={{
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <label class={styles.label}>Pattern Matching (optional):</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                class={styles.input}
                value={patternMode.value}
                onChange={(e) => (patternMode.value = e.currentTarget.value as any)}
                style={{ width: '120px' }}
              >
                <option value="include">Select</option>
                <option value="exclude">Deselect</option>
              </select>
              <select
                class={styles.input}
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
                class={styles.input}
                value={patternText.value}
                onInput={(e) => (patternText.value = e.currentTarget.value)}
                placeholder="e.g., sales_ or _2023"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                class="button button--small button--primary"
                onClick={() => Handlers.applyColumnEditorPattern()}
                disabled={!patternText.value.trim()}
              >
                Apply
              </button>
            </div>
            <div class={styles.actions} style={{ marginTop: '0.5rem' }}>
              <button
                className="button button--text button--small"
                onClick={() => Handlers.selectAllColumnEditor()}
              >
                Select All
              </button>
              <button
                className="button button--text button--small"
                onClick={() => Handlers.selectNoneColumnEditor()}
              >
                Select None
              </button>
            </div>
          </div>

          {/* Column List */}
          <ColumnSelector
            columns={getColumnNames()}
            selectedColumns={getSelectedColumnNames()}
            onSelectionChange={handleSelectionChange}
            mode="multi"
            display="list"
            allowDrag={true}
            allowRename={true}
            allowSelectAll={true}
            renameValues={getRenameValues()}
            onRenameChange={handleRenameChange}
            onReorder={handleReorder}
            maxHeight={400}
          />
        </div>
      )}

      {mode.value === 'text' && (
        <div>
          {/* Sub-mode Selection */}
          <div class={styles.group}>
            <label class={styles.label}>Text Mode Operation:</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {[
                { val: 'rename', label: 'Rename' },
                { val: 'reorder', label: 'Reorder' },
                { val: 'select', label: 'Select' },
              ].map((opt) => (
                <label key={opt.val} class={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="textSubMode"
                    value={opt.val}
                    checked={textSubMode.value === opt.val}
                    onChange={() => {
                      textSubMode.value = opt.val as any;
                      Handlers.switchColumnEditorToText();
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <p class={styles.helpText}>
            {textSubMode.value === 'rename' && (
              <span>
                Enter new names for each column (one per line, same order). Must have exactly{' '}
                <strong>{AppStore.columns.value.length}</strong> lines.
              </span>
            )}
            {textSubMode.value === 'reorder' && (
              <span>
                Rearrange column names to change order. Must include all{' '}
                <strong>{AppStore.columns.value.length}</strong> columns.
              </span>
            )}
            {textSubMode.value === 'select' && (
              <span>Keep only the listed columns. Delete lines to remove columns.</span>
            )}
          </p>

          <textarea
            class={styles.input}
            value={textValue.value}
            onInput={(e) => {
              textValue.value = e.currentTarget.value;
              Handlers.validateColumnEditorText();
            }}
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
            placeholder="Enter column names, one per line..."
          ></textarea>

          {textError.value && <div class={styles.error}>{textError.value}</div>}
        </div>
      )}

      {/* Changes Preview */}
      {changes.value.hasChanges && (
        <div class={styles.expressionHelp}>
          <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
            Changes Preview:
          </div>

          {/* Removed */}
          {changes.value.removed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-red)' }}>Remove: </span>
              <span style={{ fontSize: '0.8125rem' }}>{changes.value.removed.join(', ')}</span>
            </div>
          )}

          {/* Renamed */}
          {changes.value.renamed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-primary)' }}>Rename: </span>
              {changes.value.renamed.map((r) => (
                <span
                  key={r.from}
                  style={{ marginLeft: '0.25rem', fontSize: '0.8125rem' }}
                >{`${r.from} → ${r.to}`}</span>
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
