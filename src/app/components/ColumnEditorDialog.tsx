import { Fragment } from 'preact';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { useComputed } from '@preact/signals';
import { ColumnSelector } from './column-selector';
import formStyles from './form-controls.module.css';
import colStyles from './column-editor.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...colStyles, ...exprStyles };
import * as Handlers from '../handlers/dialog/column-editor-handlers';

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
  const { t } = useTranslation('dialogs');
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
            {t('columnEditor.modes.list')}
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'text' ? styles.active : ''}`}
            onClick={() => Handlers.switchColumnEditorToText()}
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
                onClick={() => Handlers.applyColumnEditorPattern()}
                disabled={!patternText.value.trim()}
              >
                {t('columnEditor.listMode.apply')}
              </button>
            </div>
            <div class={styles.actions} style={{ marginTop: '0.5rem' }}>
              <button
                className="button button--text button--small"
                onClick={() => Handlers.selectAllColumnEditor()}
              >
                {t('columnEditor.listMode.selectAll')}
              </button>
              <button
                className="button button--text button--small"
                onClick={() => Handlers.selectNoneColumnEditor()}
              >
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
                {t('columnEditor.textMode.help.rename', { count: AppStore.columns.value.length })}
              </span>
            )}
            {textSubMode.value === 'reorder' && (
              <span>
                {t('columnEditor.textMode.help.reorder', { count: AppStore.columns.value.length })}
              </span>
            )}
            {textSubMode.value === 'select' && (
              <span>{t('columnEditor.textMode.help.select')}</span>
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
                {Handlers.getPatternMatchedColumns('select').join(', ') ||
                  t('columnEditor.patternMode.preview.noMatch')}
              </div>
            </div>
          )}

          {patternOperationMode.value === 'remove' && patternText.value.trim() && (
            <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
              <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                {t('columnEditor.patternMode.preview.remove')}
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {Handlers.getPatternMatchedColumns('remove').join(', ') ||
                  t('columnEditor.patternMode.preview.noMatch')}
              </div>
            </div>
          )}

          {patternOperationMode.value === 'rename' && patternFind.value.trim() && (
            <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
              <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                {t('columnEditor.patternMode.preview.rename')}
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {Handlers.getPatternRenamePreview()
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
