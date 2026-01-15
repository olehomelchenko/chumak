import { useEffect, useRef } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';

export function GlobalDialogs() {
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
      class="dialog-backdrop"
      onClick={() => close(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close(false);
      }}
    >
      <div class={`dialog dialog--${messageBox.type}`} onClick={(e) => e.stopPropagation()}>
        <div class="dialog__header">
          <h3 class="dialog__title">
            <span class="iconify" data-icon={getIcon()}></span>
            <span>{messageBox.title}</span>
          </h3>
          <button class="dialog__close" onClick={() => close(false)}>
            ×
          </button>
        </div>
        <div class="dialog__content">
          <div class="dialog__message">{messageBox.message}</div>
          {messageBox.type === 'prompt' && (
            <div class="dialog__input-container">
              <input
                ref={inputRef}
                type="text"
                class="dialog__input"
                value={messageBox.inputValue}
                onInput={(e) => updateInput((e.target as HTMLInputElement).value)}
                onKeyUp={(e) => {
                  if (e.key === 'Enter') close(true);
                }}
              />
            </div>
          )}
        </div>
        <div class="dialog__footer">
          {['confirm', 'prompt'].includes(messageBox.type) && (
            <button class="button button--secondary" onClick={() => close(false)}>
              Cancel
            </button>
          )}
          <button class="button button--primary" onClick={() => close(true)}>
            {messageBox.type === 'confirm' ? 'Yes' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
