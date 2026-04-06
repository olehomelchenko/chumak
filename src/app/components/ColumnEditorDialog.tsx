import { signal } from '@preact/signals';
import { Fragment } from 'preact';
import { useTranslation } from 'preact-i18next';
import { useComputed } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import {
  consumeColumnEditorSection,
  getColumnEditorChanges,
  getPatternMatchedColumns,
  getPatternRenamePreview,
  switchColumnEditorToText,
  validateColumnEditorText,
  type ColumnEditorColumn,
  type ColumnEditorState,
} from '../handlers/dialog/column-editor-handlers';
import { ColumnSelector } from './column-selector';
import formStyles from './form-controls.module.css';
import colStyles from './column-editor.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...colStyles, ...exprStyles };

import type {
  ColumnEditorMode,
  ColumnEditorTextSubMode,
  ColumnEditorPatternMode,
  ColumnEditorPatternMatchType,
  ColumnEditorPatternOperationMode,
} from '../../types/modes';

export interface ColumnEditorChanges {
  removed: string[];
  renamed: { from: string; to: string }[];
  reordered: boolean;
  hasChanges: boolean;
}

export function ColumnEditorDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      const section = consumeColumnEditorSection();
      const editing = ctx.editingStep;

      let initialColumns: ColumnEditorColumn[];

      if (editing?.select) {
        const selectedSet = new Set(editing.select as string[]);
        const allUniqueCols = Array.from(
          new Set([...(editing.select as string[]), ...ctx.columns])
        );
        initialColumns = allUniqueCols.map((col) => ({
          original: col,
          renamed: col,
          selected: selectedSet.has(col),
        }));
      } else if (editing?.rename) {
        const renames = editing.rename || {};
        initialColumns = ctx.columns.map((col) => ({
          original: col,
          renamed: renames[col] || col,
          selected: true,
        }));
      } else if (editing?.remove) {
        const removedSet = new Set(editing.remove as string[]);
        initialColumns = ctx.columns.map((col) => ({
          original: col,
          renamed: col,
          selected: !removedSet.has(col),
        }));
      } else {
        // Fresh open
        initialColumns = ctx.columns.map((col) => ({
          original: col,
          renamed: col,
          selected: true,
        }));
      }

      return {
        mode: signal<ColumnEditorMode>('list'),
        columns: signal<ColumnEditorColumn[]>(initialColumns),
        textSubMode: signal<ColumnEditorTextSubMode>(
          section === 'select' || section === 'reorder' ? section : 'rename'
        ),
        textValue: signal(''),
        textError: signal<string | null>(null),
        patternText: signal(''),
        patternMode: signal<ColumnEditorPatternMode>('include'),
        patternMatchType: signal<ColumnEditorPatternMatchType>('prefix'),
        draggedIndex: signal<number | null>(null),
        patternOperationMode: signal<ColumnEditorPatternOperationMode>('select'),
        patternFind: signal(''),
        patternReplace: signal(''),
        patternRegex: signal(false),
        patternError: signal<string | null>(null),
      } satisfies ColumnEditorState;
    },
    {
      getState: (s) => ({
        mode: s.mode.value,
        columns: s.columns.value,
        textSubMode: s.textSubMode.value,
        textValue: s.textValue.value,
        textError: s.textError.value,
        patternText: s.patternText.value,
        patternMode: s.patternMode.value,
        patternMatchType: s.patternMatchType.value,
        patternOperationMode: s.patternOperationMode.value,
        patternFind: s.patternFind.value,
        patternReplace: s.patternReplace.value,
        patternRegex: s.patternRegex.value,
        patternError: s.patternError.value,
      }),
    }
  );

  const {
    mode,
    columns,
    patternText,
    patternMode,
    patternMatchType,
    textSubMode,
    textValue,
    textError,
    patternOperationMode,
    patternFind,
    patternReplace,
    patternRegex,
    patternError,
  } = state;

  const appColumns = AppStore.columns.value;

  // Compute changes using shared logic
  const changes = useComputed<ColumnEditorChanges>(() => {
    return getColumnEditorChanges(
      mode.value,
      textValue.value,
      textSubMode.value,
      columns.value,
      appColumns
    );
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

  // Inline: apply list-mode pattern (select/deselect by pattern)
  const applyListPattern = () => {
    const text = patternText.value.trim();
    if (!text) return;

    const pattern = text.toLowerCase();
    const matchFn = (name: string) => {
      const lower = name.toLowerCase();
      switch (patternMatchType.value) {
        case 'prefix':
          return lower.startsWith(pattern);
        case 'suffix':
          return lower.endsWith(pattern);
        case 'exact':
          return lower === pattern;
        default:
          return false;
      }
    };

    const shouldSelect = patternMode.value === 'include';
    columns.value = columns.value.map((c) => {
      if (matchFn(c.original)) {
        return { ...c, selected: shouldSelect };
      }
      return c;
    });
  };

  // Inline: select all / select none
  const selectAll = () => {
    columns.value = columns.value.map((c) => ({ ...c, selected: true }));
  };

  const selectNone = () => {
    columns.value = columns.value.map((c) => ({ ...c, selected: false }));
  };

  // Handle text validation inline
  const handleTextInput = (value: string) => {
    textValue.value = value;
    const result = validateColumnEditorText(value, textSubMode.value, appColumns);
    textError.value = result.error;
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
            {t('columnEditor.modes.list')}
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'text' ? styles.active : ''}`}
            onClick={() => switchColumnEditorToText(state)}
          >
            {t('columnEditor.modes.text')}
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'pattern' ? styles.active : ''}`}
            onClick={() => (mode.value = 'pattern')}
          >
            {t('columnEditor.modes.pattern')}
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
            <label class={styles.label}>{t('columnEditor.listMode.patternMatchingLabel')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                class={styles.input}
                value={patternMode.value}
                onChange={(e) => (patternMode.value = e.currentTarget.value as any)}
                style={{ width: '120px' }}
              >
                <option value="include">{t('columnEditor.listMode.select')}</option>
                <option value="exclude">{t('columnEditor.listMode.deselect')}</option>
              </select>
              <select
                class={styles.input}
                value={patternMatchType.value}
                onChange={(e) => (patternMatchType.value = e.currentTarget.value as any)}
                style={{ width: '140px' }}
              >
                <option value="prefix">{t('columnEditor.listMode.matchTypes.startsWith')}</option>
                <option value="suffix">{t('columnEditor.listMode.matchTypes.endsWith')}</option>
                <option value="exact">{t('columnEditor.listMode.matchTypes.exactMatch')}</option>
              </select>
              <input
                type="text"
                class={styles.input}
                value={patternText.value}
                onInput={(e) => (patternText.value = e.currentTarget.value)}
                placeholder={t('columnEditor.listMode.patternPlaceholder')}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                class="button button--small button--primary"
                onClick={applyListPattern}
                disabled={!patternText.value.trim()}
              >
                {t('columnEditor.listMode.apply')}
              </button>
            </div>
            <div class={styles.actions} style={{ marginTop: '0.5rem' }}>
              <button className="button button--text button--small" onClick={selectAll}>
                {t('columnEditor.listMode.selectAll')}
              </button>
              <button className="button button--text button--small" onClick={selectNone}>
                {t('columnEditor.listMode.selectNone')}
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
            searchable
          />
        </div>
      )}

      {mode.value === 'text' && (
        <div>
          {/* Sub-mode Selection */}
          <div class={styles.group}>
            <label class={styles.label}>{t('columnEditor.textMode.operationLabel')}</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {[
                { val: 'rename', label: t('columnEditor.textMode.operations.rename') },
                { val: 'reorder', label: t('columnEditor.textMode.operations.reorder') },
                { val: 'select', label: t('columnEditor.textMode.operations.select') },
              ].map((opt) => (
                <label key={opt.val} class={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="textSubMode"
                    value={opt.val}
                    checked={textSubMode.value === opt.val}
                    onChange={() => {
                      textSubMode.value = opt.val as any;
                      switchColumnEditorToText(state);
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
              <span>{t('columnEditor.textMode.help.rename', { count: appColumns.length })}</span>
            )}
            {textSubMode.value === 'reorder' && (
              <span>{t('columnEditor.textMode.help.reorder', { count: appColumns.length })}</span>
            )}
            {textSubMode.value === 'select' && (
              <span>{t('columnEditor.textMode.help.select')}</span>
            )}
          </p>

          <textarea
            class={styles.input}
            value={textValue.value}
            onInput={(e) => handleTextInput(e.currentTarget.value)}
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
            placeholder={t('columnEditor.textMode.placeholder')}
          ></textarea>

          {textError.value && <div class={styles.error}>{textError.value}</div>}
        </div>
      )}

      {mode.value === 'pattern' && (
        <div>
          {/* Pattern Operation Type Selector */}
          <div class={styles.group}>
            <label class={styles.label}>{t('columnEditor.patternMode.operationLabel')}</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {[
                { val: 'select', label: t('columnEditor.patternMode.operations.select') },
                { val: 'remove', label: t('columnEditor.patternMode.operations.remove') },
                { val: 'rename', label: t('columnEditor.patternMode.operations.rename') },
              ].map((opt) => (
                <label key={opt.val} class={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="patternOperationMode"
                    value={opt.val}
                    checked={patternOperationMode.value === opt.val}
                    onChange={() => {
                      patternOperationMode.value = opt.val as any;
                      patternError.value = null;
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Select/Remove Pattern UI */}
          {(patternOperationMode.value === 'select' || patternOperationMode.value === 'remove') && (
            <Fragment>
              <div class={styles.group}>
                <label class={styles.label}>{t('columnEditor.patternMode.patternLabel')}</label>
                <input
                  type="text"
                  class={styles.input}
                  value={patternText.value}
                  onInput={(e) => {
                    patternText.value = (e.target as HTMLInputElement).value;
                    patternError.value = null;
                  }}
                  placeholder={t('columnEditor.patternMode.patternPlaceholder')}
                />
              </div>

              <div class={styles.group}>
                <label class={styles.label}>{t('columnEditor.patternMode.matchTypeLabel')}</label>
                <select
                  class={styles.input}
                  value={patternMatchType.value}
                  onChange={(e) => {
                    patternMatchType.value = (e.target as HTMLSelectElement).value as any;
                    patternError.value = null;
                  }}
                >
                  <option value="prefix">{t('columnEditor.patternMode.matchTypes.prefix')}</option>
                  <option value="suffix">{t('columnEditor.patternMode.matchTypes.suffix')}</option>
                  <option value="contains">
                    {t('columnEditor.patternMode.matchTypes.contains')}
                  </option>
                  <option value="regex">{t('columnEditor.patternMode.matchTypes.regex')}</option>
                </select>
                <p class={styles.helpText}>
                  {patternMatchType.value === 'prefix' &&
                    t('columnEditor.patternMode.matchTypeHelp.prefix')}
                  {patternMatchType.value === 'suffix' &&
                    t('columnEditor.patternMode.matchTypeHelp.suffix')}
                  {patternMatchType.value === 'contains' &&
                    t('columnEditor.patternMode.matchTypeHelp.contains')}
                  {patternMatchType.value === 'regex' &&
                    t('columnEditor.patternMode.matchTypeHelp.regex')}
                </p>
              </div>

              {patternError.value && <div class={styles.error}>{patternError.value}</div>}
            </Fragment>
          )}

          {/* Rename Pattern UI */}
          {patternOperationMode.value === 'rename' && (
            <Fragment>
              <div class={styles.group}>
                <label class={styles.label}>{t('columnEditor.patternMode.findLabel')}</label>
                <input
                  type="text"
                  class={styles.input}
                  value={patternFind.value}
                  onInput={(e) => {
                    patternFind.value = (e.target as HTMLInputElement).value;
                    patternError.value = null;
                  }}
                  placeholder={t('columnEditor.patternMode.findPlaceholder')}
                />
              </div>

              <div class={styles.group}>
                <label class={styles.label}>{t('columnEditor.patternMode.replaceLabel')}</label>
                <input
                  type="text"
                  class={styles.input}
                  value={patternReplace.value}
                  onInput={(e) => {
                    patternReplace.value = (e.target as HTMLInputElement).value;
                    patternError.value = null;
                  }}
                  placeholder={t('columnEditor.patternMode.replacePlaceholder')}
                />
              </div>

              <div class={styles.group}>
                <label class={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={patternRegex.value}
                    onChange={(e) => {
                      patternRegex.value = (e.target as HTMLInputElement).checked;
                      patternError.value = null;
                    }}
                  />
                  <span>{t('columnEditor.patternMode.useRegex')}</span>
                </label>
                <p class={styles.helpText}>
                  {patternRegex.value
                    ? t('columnEditor.patternMode.regexHelp.on')
                    : t('columnEditor.patternMode.regexHelp.off')}
                </p>
              </div>

              {patternError.value && <div class={styles.error}>{patternError.value}</div>}
            </Fragment>
          )}

          {/* Pattern Preview */}
          {patternOperationMode.value === 'select' && patternText.value.trim() && (
            <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
              <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                {t('columnEditor.patternMode.preview.select')}
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {getPatternMatchedColumns(
                  patternText.value,
                  patternMatchType.value,
                  appColumns
                ).join(', ') || t('columnEditor.patternMode.preview.noMatch')}
              </div>
            </div>
          )}

          {patternOperationMode.value === 'remove' && patternText.value.trim() && (
            <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
              <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                {t('columnEditor.patternMode.preview.remove')}
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {getPatternMatchedColumns(
                  patternText.value,
                  patternMatchType.value,
                  appColumns
                ).join(', ') || t('columnEditor.patternMode.preview.noMatch')}
              </div>
            </div>
          )}

          {patternOperationMode.value === 'rename' && patternFind.value.trim() && (
            <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
              <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                {t('columnEditor.patternMode.preview.rename')}
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {getPatternRenamePreview(
                  patternFind.value,
                  patternReplace.value,
                  patternRegex.value,
                  appColumns
                )
                  .map((p) => `${p.from} -> ${p.to}`)
                  .join(', ') || t('columnEditor.patternMode.preview.noMatch')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Changes Preview */}
      {changes.value.hasChanges && (
        <div class={styles.expressionHelp}>
          <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
            {t('columnEditor.changesPreview.title')}
          </div>

          {/* Removed */}
          {changes.value.removed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-red)' }}>
                {t('columnEditor.changesPreview.remove')}
              </span>
              <span style={{ fontSize: '0.8125rem' }}>{changes.value.removed.join(', ')}</span>
            </div>
          )}

          {/* Renamed */}
          {changes.value.renamed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-primary)' }}>
                {t('columnEditor.changesPreview.rename')}
              </span>
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
              <span style={{ color: 'var(--color-accent)' }}>
                {t('columnEditor.changesPreview.reordered')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
