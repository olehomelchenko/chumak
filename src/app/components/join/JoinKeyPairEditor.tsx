import { DialogStore } from '../../stores/DialogStore';
import styles from '../TransformDialog.module.css';
import joinStyles from '../JoinDialog.module.css';
import * as JoinHandlers from '../../handlers/transform/join-handlers';

export interface KeyPairAnalysis {
  leftCol: string | null;
  rightCol: string | null;
  leftUnique: number;
  rightUnique: number;
  leftHasDuplicates: boolean;
  rightHasDuplicates: boolean;
  leftOnly: number;
  rightOnly: number;
  matches: number;
  leftTotalRows: number;
  rightTotalRows: number;
  leftNonNullRows: number;
  rightNonNullRows: number;
  leftMatchPercent: number;
  rightMatchPercent: number;
  leftOnlyPercent: number;
  rightOnlyPercent: number;
  leftOnlyValues: any[];
  rightOnlyValues: any[];
}

interface JoinKeyPairEditorProps {
  index: number;
  pair: [string | null, string | null];
  leftColumns: string[];
  rightColumns: string[];
  analysis?: KeyPairAnalysis;
  canRemove: boolean;
  onUpdate: (index: number, position: 0 | 1, value: string | null) => void;
  onRemove: (index: number) => void;
}

export function JoinKeyPairEditor({
  index,
  pair,
  leftColumns,
  rightColumns,
  analysis,
  canRemove,
  onUpdate,
  onRemove,
}: JoinKeyPairEditorProps) {
  const hasLeftError = !pair[0];
  const hasRightError = !pair[1];
  const hasError = hasLeftError || hasRightError;

  const handleShowMismatch = (values: any[], column: string, side: 'left' | 'right') => {
    if (values.length > 0) {
      DialogStore.joinState.previewMismatchValues.value = {
        values,
        column,
        side,
      };
    }
  };

  return (
    <div class={joinStyles.keyPairContainer}>
      <div class={styles.keyGrid}>
        <select
          class={`${styles.input} ${hasLeftError ? joinStyles.inputError : ''}`}
          style={{ flex: 1 }}
          value={pair[0] || ''}
          onChange={(e) => onUpdate(index, 0, e.currentTarget.value || null)}
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
          class={`${styles.input} ${hasRightError ? joinStyles.inputError : ''}`}
          style={{ flex: 1 }}
          value={pair[1] || ''}
          onChange={(e) => onUpdate(index, 1, e.currentTarget.value || null)}
        >
          <option value="">Select right column...</option>
          {rightColumns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
        <button
          class="button button--secondary button--small"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
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
              <span class={joinStyles.warningBadge} title="This column contains duplicate values">
                ⚠️ Duplicates
              </span>
            )}
          </div>
          <div class={joinStyles.analysisRow}>
            <span class={joinStyles.analysisLabel}>Right:</span>
            <span>{analysis.rightUnique} unique values</span>
            {analysis.rightHasDuplicates && (
              <span class={joinStyles.warningBadge} title="This column contains duplicate values">
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
              onClick={() =>
                handleShowMismatch(analysis.leftOnlyValues, analysis.leftCol || '', 'left')
              }
              disabled={analysis.leftOnly === 0}
              title="Click to view values"
            >
              {analysis.leftOnly}
            </button>
            <span class={joinStyles.analysisLabel}>({analysis.leftOnlyPercent}% of left rows)</span>
          </div>
          <div class={joinStyles.analysisRow}>
            <span class={joinStyles.analysisLabel}>Right only:</span>
            <button
              class={joinStyles.clickableCount}
              onClick={() =>
                handleShowMismatch(analysis.rightOnlyValues, analysis.rightCol || '', 'right')
              }
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
}

interface JoinKeysEditorProps {
  keyPairs: [string | null, string | null][];
  leftColumns: string[];
  rightColumns: string[];
  keyPairAnalysis: KeyPairAnalysis[];
  onUpdate: (index: number, position: 0 | 1, value: string | null) => void;
}

export function JoinKeysEditor({
  keyPairs,
  leftColumns,
  rightColumns,
  keyPairAnalysis,
  onUpdate,
}: JoinKeysEditorProps) {
  return (
    <div class={styles.group}>
      <label class={styles.label}>Join Keys</label>
      {keyPairs.map((pair, index) => (
        <JoinKeyPairEditor
          key={index}
          index={index}
          pair={pair}
          leftColumns={leftColumns}
          rightColumns={rightColumns}
          analysis={keyPairAnalysis[index]}
          canRemove={keyPairs.length > 1}
          onUpdate={onUpdate}
          onRemove={JoinHandlers.removeJoinKeyPair}
        />
      ))}
      <button class="button button--secondary button--small" onClick={JoinHandlers.addJoinKeyPair}>
        + Add Key Pair
      </button>
      <div class={styles.helpText}>Match rows where these columns have equal values</div>
    </div>
  );
}
