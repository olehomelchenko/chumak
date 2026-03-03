import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';
import joinStyles from './JoinDialog.module.css';
import { JoinTreeSelector } from './JoinTreeSelector';
import { TablePreviewModal } from './TablePreviewModal';
import { JoinTypeSelector, JoinKeysEditor, JoinColumnSelector } from './join';
import * as JoinHandlers from '../handlers/transform/join-handlers';
import type { JoinType } from '../../types/modes';

// Re-export for backward compatibility
export type { JoinType, JoinTarget } from '../../types/modes';

export function JoinDialog() {
  const { t } = useTranslation('dialogs');
  const {
    leftModel,
    rightModel,
    joinType,
    keyPairs,
    suffixes,
    leftColumns,
    rightColumns,
    selectedLeftColumns,
    selectedRightColumns,
    saveAsNewModel,
    previewError,
    isPreviewing,
    keyPairAnalysis,
  } = DialogStore.joinState;

  const activeModel = AppStore.activeModel.value;
  const activeSource = AppStore.activeSource.value;

  const handleLeftModelChange = (id: string) => {
    DialogStore.joinState.leftModel.value = id;
    JoinHandlers.onJoinLeftModelChange();
  };

  const handleRightModelChange = (id: string) => {
    DialogStore.joinState.rightModel.value = id;
    JoinHandlers.onJoinTargetChange();
  };

  const handleJoinTypeChange = (type: JoinType) => {
    DialogStore.joinState.joinType.value = type;
    // Re-analyze if not cross join
    if (type !== 'cross') {
      JoinHandlers.analyzeJoinKeys();
    }
  };

  const handleSuffixChange = (index: number, value: string) => {
    const newSuffixes = [...suffixes.value];
    newSuffixes[index] = value;
    DialogStore.joinState.suffixes.value = newSuffixes;
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
    DialogStore.joinState.keyPairs.value = newPairs;
    // Analyze keys after update
    JoinHandlers.analyzeJoinKeys();
  };

  const handlePreview = () => {
    JoinHandlers.previewJoin();
  };

  // Column selection handlers
  const toggleLeftColumn = (col: string) => {
    const selected = selectedLeftColumns.value;
    if (selected.includes(col)) {
      DialogStore.joinState.selectedLeftColumns.value = selected.filter((c) => c !== col);
    } else {
      DialogStore.joinState.selectedLeftColumns.value = [...selected, col];
    }
  };

  const toggleRightColumn = (col: string) => {
    const selected = selectedRightColumns.value;
    if (selected.includes(col)) {
      DialogStore.joinState.selectedRightColumns.value = selected.filter((c) => c !== col);
    } else {
      DialogStore.joinState.selectedRightColumns.value = [...selected, col];
    }
  };

  const selectAllLeftColumns = () => {
    DialogStore.joinState.selectedLeftColumns.value = [...leftColumns.value];
  };

  const selectNoneLeftColumns = () => {
    DialogStore.joinState.selectedLeftColumns.value = [];
  };

  const selectAllRightColumns = () => {
    DialogStore.joinState.selectedRightColumns.value = [...rightColumns.value];
  };

  const selectNoneRightColumns = () => {
    DialogStore.joinState.selectedRightColumns.value = [];
  };

  // Get current left model ID (from active model or source)
  const currentLeftId = activeModel?.id || activeSource?.id || null;
  const effectiveLeftId = leftModel.value || currentLeftId;

  return (
    <div class={joinStyles.joinDialog}>
      {/* Two-column layout for source/model selection */}
      <div class={joinStyles.sourceSelectorGrid}>
        {/* Left Side */}
        <div class={joinStyles.sourceSelector}>
          <label class={styles.label}>{t('join.leftTable')}</label>
          <div class={joinStyles.currentSelection}>
            {effectiveLeftId && (
              <div class={joinStyles.currentSelectionItem}>
                {activeModel && effectiveLeftId === activeModel.id ? (
                  <>
                    <span class={joinStyles.icon}>📊</span>
                    <span class={joinStyles.name}>{activeModel.name}</span>
                  </>
                ) : activeSource && effectiveLeftId === activeSource.id ? (
                  <>
                    <span class={joinStyles.icon}>📄</span>
                    <span class={joinStyles.name}>{activeSource.name}</span>
                  </>
                ) : (
                  <span class={joinStyles.name}>Selected</span>
                )}
              </div>
            )}
          </div>
          <JoinTreeSelector
            selectedId={effectiveLeftId}
            onSelect={handleLeftModelChange}
            excludeId={rightModel.value}
            onPreview={(id) => {
              DialogStore.joinState.previewTableId.value = id;
            }}
          />
        </div>

        {/* Right Side */}
        <div class={joinStyles.sourceSelector}>
          <label class={styles.label}>{t('join.rightTable')}</label>
          <JoinTreeSelector
            selectedId={rightModel.value}
            onSelect={handleRightModelChange}
            excludeId={effectiveLeftId}
            onPreview={(id) => {
              DialogStore.joinState.previewTableId.value = id;
            }}
          />
        </div>
      </div>

      {/* Join Type */}
      <JoinTypeSelector joinType={joinType} onChange={handleJoinTypeChange} />

      {/* Join Keys */}
      {joinType.value !== 'cross' && (
        <JoinKeysEditor
          keyPairs={keyPairs.value as [string | null, string | null][]}
          leftColumns={leftColumns.value}
          rightColumns={rightColumns.value}
          keyPairAnalysis={keyPairAnalysis.value}
          onUpdate={updateKeyPair}
        />
      )}

      {/* Column Selection */}
      <div class={joinStyles.columnSelectionGrid}>
        {/* Left Columns */}
        <JoinColumnSelector
          label={t('join.leftColumnsLabel')}
          columns={leftColumns.value}
          selectedColumns={selectedLeftColumns.value}
          onToggle={toggleLeftColumn}
          onSelectAll={selectAllLeftColumns}
          onSelectNone={selectNoneLeftColumns}
        />

        {/* Right Columns */}
        {joinType.value !== 'semi' && joinType.value !== 'anti' && (
          <JoinColumnSelector
            label={t('join.rightColumnsLabel')}
            columns={rightColumns.value}
            selectedColumns={selectedRightColumns.value}
            onToggle={toggleRightColumn}
            onSelectAll={selectAllRightColumns}
            onSelectNone={selectNoneRightColumns}
          />
        )}
      </div>

      {/* Column Suffixes */}
      <div class={styles.group}>
        <label class={styles.label}>{t('join.suffixesLabel')}</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            class={styles.input}
            style={{ flex: 1 }}
            value={suffixes.value[0]}
            onInput={(e) => handleSuffixChange(0, e.currentTarget.value)}
            placeholder={t('join.suffixPlaceholder.left')}
          />
          <span>/</span>
          <input
            type="text"
            class={styles.input}
            style={{ flex: 1 }}
            value={suffixes.value[1]}
            onInput={(e) => handleSuffixChange(1, e.currentTarget.value)}
            placeholder={t('join.suffixPlaceholder.right')}
          />
        </div>
        <div class={styles.helpText}>{t('join.suffixesHelp')}</div>
      </div>

      {/* Save as New Model */}
      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={saveAsNewModel.value}
            onChange={(e) => {
              DialogStore.joinState.saveAsNewModel.value = e.currentTarget.checked;
            }}
          />
          <span>{t('join.saveAsNew')}</span>
        </label>
      </div>

      {/* Inline Help */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>{t('join.types.title')}</span>
        </div>
        <div class={styles.exampleGrid} style={{ fontFamily: 'var(--font-family)' }}>
          <div>
            <strong>{t('join.types.left')}</strong>
          </div>
          <div class={styles.exampleDescription}>{t('join.types.leftDesc')}</div>
          <div>
            <strong>{t('join.types.right')}</strong>
          </div>
          <div class={styles.exampleDescription}>{t('join.types.rightDesc')}</div>
          <div>
            <strong>{t('join.types.inner')}</strong>
          </div>
          <div class={styles.exampleDescription}>{t('join.types.innerDesc')}</div>
          <div>
            <strong>{t('join.types.full')}</strong>
          </div>
          <div class={styles.exampleDescription}>{t('join.types.fullDesc')}</div>
          <div>
            <strong>{t('join.types.semi')}</strong>
          </div>
          <div class={styles.exampleDescription}>{t('join.types.semiDesc')}</div>
          <div>
            <strong>{t('join.types.anti')}</strong>
          </div>
          <div class={styles.exampleDescription}>{t('join.types.antiDesc')}</div>
        </div>
      </div>

      {/* Preview Button */}
      <div class={styles.group}>
        <button
          class="button button--secondary"
          onClick={handlePreview}
          disabled={isPreviewing.value || !rightModel.value}
        >
          {isPreviewing.value ? t('join.previewing') : t('join.preview')}
        </button>
      </div>

      {/* Preview Error */}
      {previewError.value && <div class={styles.error}>{previewError.value}</div>}

      {/* Table Preview Modal */}
      <TablePreviewModal />
    </div>
  );
}
