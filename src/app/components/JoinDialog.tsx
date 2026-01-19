import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';
import joinStyles from './JoinDialog.module.css';
import { JoinTreeSelector } from './JoinTreeSelector';
import { TablePreviewModal } from './TablePreviewModal';
import * as JoinHandlers from '../handlers/join-handlers';

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross';

export interface JoinTarget {
  id: string;
  name: string;
  type: 'model' | 'source';
  sourceName?: string;
}

// Icon mapping for join types
const joinTypeIcons: Record<JoinType, string> = {
  inner: 'carbon:join-inner',
  left: 'carbon:join-left',
  right: 'carbon:join-right',
  full: 'carbon:join-full',
  cross: 'carbon:join',
};

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

  const handleJoinTypeChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    DialogStore.joinState.joinType.value = target.value as JoinType;
    // Re-analyze if not cross join
    if (target.value !== 'cross') {
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
      <div class={styles.group}>
        <label class={styles.label}>Join Type</label>
        <div class={joinStyles.joinTypeGrid}>
          {(['inner', 'left', 'right', 'full', 'cross'] as JoinType[]).map((type) => (
            <label key={type} class={styles.radioLabel}>
              <input
                type="radio"
                name="joinType"
                value={type}
                checked={joinType.value === type}
                onChange={handleJoinTypeChange}
              />
              <span
                class="iconify"
                data-icon={joinTypeIcons[type]}
                style={{ fontSize: '16px' }}
              ></span>
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
          {keyPairs.value.map((pair, index) => {
            const analysis = keyPairAnalysis.value[index];
            const hasLeftError = !pair[0];
            const hasRightError = !pair[1];
            const hasError = hasLeftError || hasRightError;

            return (
              <div key={index} class={joinStyles.keyPairContainer}>
                <div class={styles.keyGrid}>
                  <select
                    class={`${styles.input} ${hasLeftError ? joinStyles.inputError : ''}`}
                    style={{ flex: 1 }}
                    value={pair[0] || ''}
                    onChange={(e) => updateKeyPair(index, 0, e.currentTarget.value || null)}
                  >
                    <option value="">Select left column...</option>
                    {leftColumns.value.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <span>=</span>
                  <select
                    class={`${styles.input} ${hasRightError ? joinStyles.inputError : ''}`}
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
                    onClick={() => JoinHandlers.removeJoinKeyPair(index)}
                    disabled={keyPairs.value.length === 1}
                    title="Remove key pair"
                  >
                    ×
                  </button>
                </div>

                {/* Validation Errors */}
                {hasError && (
                  <div class={joinStyles.validationError}>
                    {hasLeftError && <span>Left column is required</span>}
                    {hasLeftError && hasRightError && <span> • </span>}
                    {hasRightError && <span>Right column is required</span>}
                  </div>
                )}

                {/* Analysis Results */}
                {!hasError && analysis && pair[0] && pair[1] && (
                  <div class={joinStyles.analysisBox}>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Left:</span>
                      <span>{analysis.leftUnique} unique values</span>
                      {analysis.leftHasDuplicates && (
                        <span
                          class={joinStyles.warningBadge}
                          title="This column contains duplicate values"
                        >
                          ⚠️ Duplicates
                        </span>
                      )}
                    </div>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Right:</span>
                      <span>{analysis.rightUnique} unique values</span>
                      {analysis.rightHasDuplicates && (
                        <span
                          class={joinStyles.warningBadge}
                          title="This column contains duplicate values"
                        >
                          ⚠️ Duplicates
                        </span>
                      )}
                    </div>
                    <div class={joinStyles.analysisDivider}></div>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Matches:</span>
                      <span class={joinStyles.matchCount}>{analysis.matches}</span>
                      <span class={joinStyles.analysisLabel}>values</span>
                    </div>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Left match:</span>
                      <span class={joinStyles.matchPercent}>{analysis.leftMatchPercent}%</span>
                      <span class={joinStyles.analysisLabel}>of left rows will match</span>
                    </div>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Right match:</span>
                      <span class={joinStyles.matchPercent}>{analysis.rightMatchPercent}%</span>
                      <span class={joinStyles.analysisLabel}>of right rows will match</span>
                    </div>
                    <div class={joinStyles.analysisDivider}></div>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Left only:</span>
                      <button
                        class={joinStyles.clickableCount}
                        onClick={() => {
                          if (analysis.leftOnlyValues.length > 0) {
                            DialogStore.joinState.previewMismatchValues.value = {
                              values: analysis.leftOnlyValues,
                              column: analysis.leftCol || '',
                              side: 'left',
                            };
                          }
                        }}
                        disabled={analysis.leftOnly === 0}
                        title="Click to view values"
                      >
                        {analysis.leftOnly}
                      </button>
                      <span class={joinStyles.analysisLabel}>
                        ({analysis.leftOnlyPercent}% of left rows)
                      </span>
                    </div>
                    <div class={joinStyles.analysisRow}>
                      <span class={joinStyles.analysisLabel}>Right only:</span>
                      <button
                        class={joinStyles.clickableCount}
                        onClick={() => {
                          if (analysis.rightOnlyValues.length > 0) {
                            DialogStore.joinState.previewMismatchValues.value = {
                              values: analysis.rightOnlyValues,
                              column: analysis.rightCol || '',
                              side: 'right',
                            };
                          }
                        }}
                        disabled={analysis.rightOnly === 0}
                        title="Click to view values"
                      >
                        {analysis.rightOnly}
                      </button>
                      <span class={joinStyles.analysisLabel}>
                        ({analysis.rightOnlyPercent}% of right rows)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button
            class="button button--secondary button--small"
            onClick={JoinHandlers.addJoinKeyPair}
          >
            + Add Key Pair
          </button>
          <div class={styles.helpText}>Match rows where these columns have equal values</div>
        </div>
      )}

      {/* Column Selection */}
      <div class={joinStyles.columnSelectionGrid}>
        {/* Left Columns */}
        <div class={styles.group}>
          <label class={styles.label}>Left Columns to Include</label>
          <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectAllLeftColumns}
            >
              Select All
            </button>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectNoneLeftColumns}
            >
              Select None
            </button>
          </div>
          <div class={styles.columnEditorList}>
            {leftColumns.value.map((col) => {
              const isSelected = selectedLeftColumns.value.includes(col);
              return (
                <div
                  key={col}
                  class={`${styles.columnEditorItem} ${!isSelected ? styles.unselected : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    class={styles.itemCheckbox}
                    onClick={() => toggleLeftColumn(col)}
                  >
                    <span
                      style={{
                        color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                      }}
                    >
                      {isSelected ? '✓' : '✗'}
                    </span>
                  </button>

                  {/* Column Name */}
                  <span
                    class={styles.originalName}
                    style={{
                      textDecoration: !isSelected ? 'line-through' : 'none',
                      opacity: !isSelected ? 0.6 : 1,
                    }}
                  >
                    {col}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Columns */}
        <div class={styles.group}>
          <label class={styles.label}>Right Columns to Include</label>
          <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectAllRightColumns}
            >
              Select All
            </button>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectNoneRightColumns}
            >
              Select None
            </button>
          </div>
          <div class={styles.columnEditorList}>
            {rightColumns.value.map((col) => {
              const isSelected = selectedRightColumns.value.includes(col);
              return (
                <div
                  key={col}
                  class={`${styles.columnEditorItem} ${!isSelected ? styles.unselected : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    class={styles.itemCheckbox}
                    onClick={() => toggleRightColumn(col)}
                  >
                    <span
                      style={{
                        color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                      }}
                    >
                      {isSelected ? '✓' : '✗'}
                    </span>
                  </button>

                  {/* Column Name */}
                  <span
                    class={styles.originalName}
                    style={{
                      textDecoration: !isSelected ? 'line-through' : 'none',
                      opacity: !isSelected ? 0.6 : 1,
                    }}
                  >
                    {col}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
