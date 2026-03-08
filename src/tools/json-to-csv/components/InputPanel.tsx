import { useRef } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { rawText, fileName, updateText, loadFile, reset } from '../state';
import styles from '../JsonToCsv.module.css';

export function InputPanel() {
  const { t } = useTranslation('tools');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) loadFile(file);
  };

  const hasContent = rawText.value.length > 0;

  return (
    <div class={styles.topPanel}>
      <div class={styles.inputHeader}>
        <span class={styles.inputHint}>{t('jsonToCsv.input.hint')}</span>
        <div class={styles.inputActions}>
          <button class={styles.uploadButton} onClick={() => inputRef.current?.click()}>
            {t('jsonToCsv.input.upload')}
          </button>
          {hasContent && (
            <button class={styles.clearButton} onClick={reset}>
              {t('jsonToCsv.newFile')}
            </button>
          )}
        </div>
      </div>

      <textarea
        class={styles.textarea}
        value={rawText.value}
        placeholder={t('jsonToCsv.input.placeholder')}
        onInput={(e) => updateText((e.target as HTMLTextAreaElement).value)}
      />

      {fileName.value && <span class={styles.inputHint}>{fileName.value}.json</span>}

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        class={styles.fileInput}
        onChange={handleFileChange}
      />
    </div>
  );
}
