import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';
import joinStyles from './JoinDialog.module.css';
import { JoinTreeSelector } from './JoinTreeSelector';
import { TablePreviewModal } from './TablePreviewModal';
import { JoinTypeSelector, JoinKeysEditor, JoinColumnSelector } from './join';
import * as JoinHandlers from '../handlers/transform/join-handlers';

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross' | 'semi' | 'anti' | 'lookup';

export interface JoinTarget {
  id: string;
  name: string;
  type: 'model' | 'source';
  sourceName?: string;
}

export function JoinDialog() {
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
          <label class={styles.label}>Left Table</label>
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
          <label class={styles.label}>Right Table</label>
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
          label="Left Columns to Include"
          columns={leftColumns.value}
          selectedColumns={selectedLeftColumns.value}
          onToggle={toggleLeftColumn}
          onSelectAll={selectAllLeftColumns}
          onSelectNone={selectNoneLeftColumns}
        />

        {/* Right Columns */}
        {joinType.value !== 'semi' && joinType.value !== 'anti' && (
          <JoinColumnSelector
            label="Right Columns to Include"
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
          <span>Save result as a new model</span>
        </label>
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

      {/* Table Preview Modal */}
      <TablePreviewModal />
    </div>
  );
}
