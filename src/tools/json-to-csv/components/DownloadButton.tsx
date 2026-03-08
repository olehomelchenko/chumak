import { useState } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { fileName, totalRows, downloadCsv, copyCsv } from '../state';
import styles from '../JsonToCsv.module.css';

export function DownloadButton() {
  const { t } = useTranslation('tools');
  const [customName, setCustomName] = useState('');
  const [copied, setCopied] = useState(false);

  if (totalRows.value === 0) return null;

  const handleCopy = () => {
    copyCsv();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class={styles.downloadSection}>
      <input
        type="text"
        class={styles.filenameInput}
        value={customName}
        placeholder={`${fileName.value || 'output'}.csv`}
        onInput={(e) => setCustomName((e.target as HTMLInputElement).value)}
      />
      <button class={styles.copyButton} onClick={handleCopy}>
        {copied ? t('jsonToCsv.download.copied') : t('jsonToCsv.download.copy')}
      </button>
      <button class={styles.downloadButton} onClick={() => downloadCsv(customName || undefined)}>
        {t('jsonToCsv.download.button')}
      </button>
    </div>
  );
}
