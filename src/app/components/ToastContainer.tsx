import { AppStore } from '../stores/AppStore';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const notifications = AppStore.notifications.value;

  const dismiss = (id: number) => {
    const notifs = AppStore.notifications.value;
    const n = notifs.find((i) => i.id === id);
    if (n) {
      // Trigger fade-out animation, then remove
      AppStore.notifications.value = notifs.map((x) =>
        x.id === id ? { ...x, visible: false } : x
      );
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
    <div class={styles.toastContainer}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          class={`${styles.toast} ${notification.visible ? styles.visible : ''} ${styles[notification.type]}`}
        >
          <div class={styles.toast__icon}>
            <span class="iconify" data-icon={getIcon(notification.type)}></span>
          </div>
          <div class={styles.toast__content}>
            <div class={styles.toast__title}>{notification.title}</div>
            <div class={styles.toast__message}>{notification.message}</div>
            {notification.stepInfo && (
              <div class={styles.toast__stepInfo}>{notification.stepInfo}</div>
            )}
          </div>
          <button
            class={styles.toast__close}
            onClick={() => dismiss(notification.id)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
