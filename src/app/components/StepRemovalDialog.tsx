import { AppStore } from '../stores/AppStore';
import styles from './Dialog.module.css';

export function StepRemovalDialog() {
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
            <span>Remove Step</span>
          </h3>
          <button class={styles.close} onClick={() => close(false)}>
            ×
          </button>
        </div>
        <div class={styles.content}>
          <div class={styles.message}>
            Remove step "<span>{modal.stepName}</span>"?
          </div>
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
                <strong>Remove this step and all following steps</strong>
                {modal.affectedSteps.length > 0 && (
                  <div class={styles.preview}>
                    <span class={styles.previewLabel}>Will also remove:</span>
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
                <strong>Remove only this step</strong>
                <div class={styles.warning}>
                  <span
                    class="iconify"
                    data-icon="carbon:warning"
                    style={{ color: 'var(--color-yellow)' }}
                  ></span>
                  Following steps may fail if they depend on this step's output
                </div>
              </div>
            </label>
          </div>
        </div>
        <div class={styles.footer}>
          <button class="button button--secondary" onClick={() => close(false)}>
            Cancel
          </button>
          <button class="button button--danger" onClick={() => close(true)}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
