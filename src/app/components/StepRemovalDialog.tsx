import { AppStore } from '../stores/AppStore';

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
      class="dialog-backdrop"
      onClick={() => close(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close(false);
      }}
    >
      <div class="dialog dialog--warning" onClick={(e) => e.stopPropagation()}>
        <div class="dialog__header">
          <h3 class="dialog__title">
            <span class="iconify" data-icon="carbon:warning"></span>
            <span>Remove Step</span>
          </h3>
          <button class="dialog__close" onClick={() => close(false)}>
            ×
          </button>
        </div>
        <div class="dialog__content">
          <div class="dialog__message">
            Remove step "<span>{modal.stepName}</span>"?
          </div>
          <div class="step-removal-options">
            <label class="step-removal-option">
              <input
                type="radio"
                name="removeMode"
                value="all"
                checked={modal.removeMode === 'all'}
                onChange={() => setRemoveMode('all')}
              />
              <div class="step-removal-option__content">
                <strong>Remove this step and all following steps</strong>
                {modal.affectedSteps.length > 0 && (
                  <div class="step-removal-option__preview">
                    <span class="step-removal-option__label">Will also remove:</span>
                    <ul class="step-removal-option__list">
                      {modal.affectedSteps.map((stepName, i) => (
                        <li key={i}>{stepName}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </label>
            <label class="step-removal-option">
              <input
                type="radio"
                name="removeMode"
                value="single"
                checked={modal.removeMode === 'single'}
                onChange={() => setRemoveMode('single')}
              />
              <div class="step-removal-option__content">
                <strong>Remove only this step</strong>
                <div class="step-removal-option__warning">
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
        <div class="dialog__footer">
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
