import { AppStore } from '../../stores/AppStore';
import i18n from '../../../i18n';

/**
 * Show an error notification
 */
export function showError(
  title: string,
  message: string,
  options: { stepIndex?: number; stepDescription?: string; duration?: number } = {}
): void {
  const { stepIndex, stepDescription, duration = 0 } = options;
  let stepInfo: string | null = null;
  if (stepIndex !== undefined && stepDescription) {
    stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
  }
  _addNotification('error', title, message, stepInfo, duration);
}

/**
 * Show a warning notification
 */
export function showWarning(
  title: string,
  message: string,
  options: { duration?: number } = {}
): void {
  const { duration = 6000 } = options;
  _addNotification('warning', title, message, null, duration);
}

/**
 * Show a success notification
 */
export function showSuccess(message: string, options: { duration?: number } = {}): void {
  const { duration = 3000 } = options;
  _addNotification(
    'success',
    i18n.t('notifications.successTitle', { ns: 'common' }),
    message,
    null,
    duration
  );
}

/**
 * Add a notification to the store
 * @internal Exported for backward compatibility with SytoApp
 */
export function _addNotification(
  type: string,
  title: string,
  message: string,
  stepInfo: string | null,
  duration: number
): void {
  const id = AppStore.notificationIdCounter.value + 1;
  AppStore.notificationIdCounter.value = id;

  const notification = {
    id,
    type,
    title,
    message,
    stepInfo,
    visible: false,
  };

  AppStore.notifications.value = [...AppStore.notifications.value, notification];

  // Make visible after a brief delay (for animation)
  setTimeout(() => {
    AppStore.notifications.value = AppStore.notifications.value.map((n) =>
      n.id === id ? { ...n, visible: true } : n
    );
  }, 10);

  // Auto-dismiss if duration is set
  if (duration > 0) {
    setTimeout(() => dismissNotification(id), duration);
  }
}

/**
 * Dismiss a notification by ID
 */
export function dismissNotification(id: number): void {
  // First mark as not visible (for fade-out animation)
  AppStore.notifications.value = AppStore.notifications.value.map((n) =>
    n.id === id ? { ...n, visible: false } : n
  );

  // Then remove after animation delay
  setTimeout(() => {
    AppStore.notifications.value = AppStore.notifications.value.filter((n) => n.id !== id);
  }, 200);
}

/**
 * Get icon for a notification type
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'error':
      return '⚠️';
    case 'warning':
      return '⚡';
    case 'success':
      return '✓';
    default:
      return 'ℹ️';
  }
}

/**
 * Show an alert dialog and wait for user to dismiss it
 */
export function alert(
  message: string,
  title = i18n.t('notifications.alertTitle', { ns: 'common' })
): Promise<boolean> {
  return new Promise((resolve) => {
    AppStore.messageBox.value = {
      visible: true,
      title,
      message,
      type: 'alert',
      inputValue: '',
      resolve,
    };
  });
}

/**
 * Show a confirmation dialog and wait for user response
 */
export function confirm(
  message: string,
  title = i18n.t('notifications.confirmTitle', { ns: 'common' })
): Promise<boolean> {
  return new Promise((resolve) => {
    AppStore.messageBox.value = {
      visible: true,
      title,
      message,
      type: 'confirm',
      inputValue: '',
      resolve,
    };
  });
}

/**
 * Show a prompt dialog and wait for user input
 */
export function prompt(
  message: string,
  defaultValue = '',
  title = i18n.t('notifications.promptTitle', { ns: 'common' })
): Promise<string | null> {
  return new Promise((resolve) => {
    AppStore.messageBox.value = {
      visible: true,
      title,
      message,
      type: 'prompt',
      inputValue: defaultValue,
      resolve,
    };
  });
}

/**
 * Close the message box and resolve the promise
 */
export function closeMessageBox(result: boolean): void {
  const { resolve, type, inputValue } = AppStore.messageBox.value;

  // Close the message box
  AppStore.messageBox.value = {
    ...AppStore.messageBox.value,
    visible: false,
  };

  // Resolve the promise based on dialog type
  if (resolve) {
    if (type === 'prompt') {
      resolve(result ? inputValue : null);
    } else if (type === 'confirm') {
      resolve(result);
    } else {
      resolve(true); // alert always resolves to true
    }
  }
}

/**
 * Get icon for the current message box type
 */
export function getMessageBoxIcon(): string {
  switch (AppStore.messageBox.value.type) {
    case 'alert':
      return 'carbon:information-filled';
    case 'confirm':
      return 'carbon:help-filled';
    case 'prompt':
      return 'carbon:edit';
    default:
      return 'carbon:information-filled';
  }
}
