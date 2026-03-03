import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import styles from './Dialog.module.css';

export function StepRemovalDialog() {
  const { t } = useTranslation('ui');
  const modal = AppStore.stepRemovalModal.value;

  if (!modal.visible) return null;

  const close = (confirmed: boolean) => {
    const { resolve, removeMode } = modal;
    AppStore.stepRemovalModal.value = { ...modal, visible: false };

    if (resolve) {
      resolve(confirmed ? removeMode : null);
    }
  };

  const setRemoveMode = (mode: 'single' | 'all') => {
    AppStore.stepRemovalModal.value = { ...modal, removeMode: mode };
  };

  return (
    <div
      class={styles.backdrop}
      onClick={() => close(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close(false);
      }}
    >
      <div class={`${styles.dialog} ${styles.warning}`} onClick={(e) => e.stopPropagation()}>
        <div class={styles.header}>
          <h3 class={styles.title}>
            <span class="iconify" data-icon="carbon:warning"></span>
            <span>{t('stepRemoval.title')}</span>
          </h3>
          <button class={styles.close} onClick={() => close(false)}>
            ×
          </button>
        </div>
        <div class={styles.content}>
          <div class={styles.message}>{t('stepRemoval.message', { stepName: modal.stepName })}</div>
          <div class={styles.options}>
            <label class={`${styles.option} ${modal.removeMode === 'all' ? styles.active : ''}`}>
              <input
                type="radio"
                name="removeMode"
                value="all"
                checked={modal.removeMode === 'all'}
                onChange={() => setRemoveMode('all')}
              />
              <div class={styles.optionContent}>
                <strong>{t('stepRemoval.modes.all')}</strong>
                {modal.affectedSteps.length > 0 && (
                  <div class={styles.preview}>
                    <span class={styles.previewLabel}>{t('stepRemoval.willRemove')}</span>
                    <ul class={styles.previewList}>
                      {modal.affectedSteps.map((stepName, i) => (
                        <li key={i}>{stepName}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </label>
            <label class={`${styles.option} ${modal.removeMode === 'single' ? styles.active : ''}`}>
              <input
                type="radio"
                name="removeMode"
                value="single"
                checked={modal.removeMode === 'single'}
                onChange={() => setRemoveMode('single')}
              />
              <div class={styles.optionContent}>
                <strong>{t('stepRemoval.modes.single')}</strong>
                <div class={styles.warning}>
                  <span
                    class="iconify"
                    data-icon="carbon:warning"
                    style={{ color: 'var(--color-yellow)' }}
                  ></span>
                  {t('stepRemoval.warning')}
                </div>
              </div>
            </label>
          </div>
        </div>
        <div class={styles.footer}>
          <button class="button button--secondary" onClick={() => close(false)}>
            {t('buttons.cancel', { ns: 'common' })}
          </button>
          <button class="button button--danger" onClick={() => close(true)}>
            {t('buttons.remove', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>
  );
}
