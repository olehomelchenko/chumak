import { useEffect, useCallback, useMemo } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { EditorView } from '@codemirror/view';
import { AppStore } from '../stores/AppStore';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { InlineBanner } from './InlineBanner';
import { lintTransformJson, getTransformJsonError } from '../linters/transform-linter';
import appStyles from './App.module.css';
import styles from './JsonEditorModal.module.css';

export interface JsonEditorModalProps {
  onCancel: () => void;
  onApply: () => void;
}

export function JsonEditorModal({ onCancel, onApply }: JsonEditorModalProps) {
  const { t } = useTranslation('ui');
  const jsonEditMode = AppStore.jsonEditMode.value;
  const jsonEditContent = AppStore.jsonEditContent.value;
  const jsonEditError = AppStore.jsonEditError.value;

  // Compute diagnostics for the current content
  const diagnostics = useMemo(() => {
    if (!jsonEditMode) return [];
    return lintTransformJson(jsonEditContent);
  }, [jsonEditMode, jsonEditContent]);

  // Handle content changes
  const handleContentChange = useCallback((value: string) => {
    AppStore.jsonEditContent.value = value;
    // Update error state for Apply button
    AppStore.jsonEditError.value = getTransformJsonError(value);
  }, []);

  // Handle editor ready - focus it
  const handleEditorReady = useCallback((view: EditorView) => {
    setTimeout(() => view.focus(), 50);
  }, []);

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Handle dialog click - stop propagation
  const handleDialogClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!jsonEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jsonEditMode, onCancel]);

  if (!jsonEditMode) return null;

  return (
    <div
      class={appStyles.centeredModalBackdrop}
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div
        class={appStyles.centeredModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="json-editor-title"
        style={{ width: '900px', maxWidth: '90vw', height: '80vh' }}
        onClick={handleDialogClick}
      >
        <div class={appStyles.centeredModalHeader}>
          <h3 id="json-editor-title">{t('jsonEditor.title')}</h3>
          <button onClick={onCancel} aria-label={t('jsonEditor.close')}>
            &times;
          </button>
        </div>

        <InlineBanner variant="warning" icon="carbon:warning">
          {t('jsonEditor.warning')}
        </InlineBanner>

        <div class={styles.editorContainer}>
          <CodeMirrorEditor
            value={jsonEditContent}
            onChange={handleContentChange}
            diagnostics={diagnostics}
            className={styles.editor}
            onEditorReady={handleEditorReady}
          />
        </div>

        {jsonEditError && <InlineBanner variant="error">{jsonEditError}</InlineBanner>}

        <div class={appStyles.centeredModalFooter}>
          <button class="button button--secondary" onClick={onCancel}>
            {t('buttons.cancel', { ns: 'common' })}
          </button>
          <button class="button button--danger" onClick={onApply} disabled={!!jsonEditError}>
            {t('jsonEditor.applyChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
