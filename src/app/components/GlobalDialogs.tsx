import { useEffect, useRef } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import styles from './Dialog.module.css';
import { useTranslation } from 'preact-i18next';

export function GlobalDialogs() {
  const { t } = useTranslation('common');
  const messageBox = AppStore.messageBox.value;
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input for prompt
  useEffect(() => {
    if (messageBox.visible && messageBox.type === 'prompt' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messageBox.visible, messageBox.type]);

  if (!messageBox.visible) return null;

  const close = (result: boolean) => {
    const { resolve, type, inputValue } = messageBox;

    // Update visible first
    AppStore.messageBox.value = { ...messageBox, visible: false };

    if (resolve) {
      if (type === 'prompt') {
        resolve(result ? inputValue : null);
      } else if (type === 'confirm') {
        resolve(result);
      } else {
        resolve(true);
      }
    }
  };

  const updateInput = (val: string) => {
    AppStore.messageBox.value = { ...messageBox, inputValue: val };
  };

  const getIcon = () => {
    switch (messageBox.type) {
      case 'alert':
        return 'carbon:information-filled';
      case 'confirm':
        return 'carbon:help-filled';
      case 'prompt':
        return 'carbon:edit';
      default:
        return 'carbon:information-filled';
    }
  };

  return (
    <div
      class={styles.backdrop}
      onClick={() => close(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close(false);
      }}
    >
      <div
        class={`${styles.dialog} ${styles[messageBox.type]}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="global-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div class={styles.header}>
          <h3 id="global-dialog-title" class={styles.title}>
            <span class="iconify" aria-hidden="true" data-icon={getIcon()}></span>
            <span>{messageBox.title}</span>
          </h3>
          <button class={styles.close} onClick={() => close(false)} aria-label={t('buttons.close')}>
            ×
          </button>
        </div>
        <div class={styles.content}>
          <div class={styles.message}>{messageBox.message}</div>
          {messageBox.type === 'prompt' && (
            <div class={styles.inputContainer}>
              <input
                ref={inputRef}
                type="text"
                class={styles.input}
                value={messageBox.inputValue}
                onInput={(e) => updateInput((e.target as HTMLInputElement).value)}
                onKeyUp={(e) => {
                  if (e.key === 'Enter') close(true);
                }}
              />
            </div>
          )}
        </div>
        <div class={styles.footer}>
          {['confirm', 'prompt'].includes(messageBox.type) && (
            <button class="button button--secondary" onClick={() => close(false)}>
              {t('buttons.cancel')}
            </button>
          )}
          <button class="button button--primary" onClick={() => close(true)}>
            {messageBox.type === 'confirm'
              ? messageBox.confirmLabel || t('buttons.yes')
              : t('buttons.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}
