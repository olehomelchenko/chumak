import { AppStore } from '../stores/AppStore';

export function ToastContainer() {
  const notifications = AppStore.notifications.value;

  const dismiss = (id: number) => {
    // Trigger animation out
    const notifs = AppStore.notifications.value;
    const n = notifs.find((i) => i.id === id);
    if (n) {
      // We can't easily mutate the object inside signal array to trigger re-render of just that item
      // unless we replace the array or use profound signals.
      // But the legacy handler does: notification.visible = false.
      // If the array contains objects that are NOT signals themselves,
      // mutating them won't trigger Preact update unless we assign the array again.
      // The legacy code proxies might handle it, or Alpine does.
      // In Preact, we should favor immutable updates.

      // Let's implement dismiss logic here or call the handler if available?
      // Logic is simple: set visible=false, wait, remove.
      // We can just call a helper or do it here.

      const updateNotif = (diff: Partial<typeof n>) => {
        AppStore.notifications.value = AppStore.notifications.value.map((x) =>
          x.id === id ? { ...x, ...diff } : x
        );
      };

      updateNotif({ visible: false });
      setTimeout(() => {
        AppStore.notifications.value = AppStore.notifications.value.filter((x) => x.id !== id);
      }, 200);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return 'carbon:error-filled';
      case 'warning':
        return 'carbon:warning-filled';
      case 'success':
        return 'carbon:checkmark-filled';
      default:
        return 'carbon:information-filled';
    }
  };

  return (
    <div class="toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          class={`toast ${notification.visible ? 'toast--visible' : ''} toast--${notification.type}`}
        >
          <div class="toast__icon">
            <span class="iconify" data-icon={getIcon(notification.type)}></span>
          </div>
          <div class="toast__content">
            <div class="toast__title">{notification.title}</div>
            <div class="toast__message">{notification.message}</div>
            {notification.stepInfo && <div class="toast__step-info">{notification.stepInfo}</div>}
          </div>
          <button class="toast__close" onClick={() => dismiss(notification.id)} title="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
