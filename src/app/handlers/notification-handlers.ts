import type { SytoApp } from '../../syto-app';

export function showError(this: SytoApp, title: string, message: string, options: any = {}) {
  const { stepIndex, stepDescription, duration = 0 } = options;
  let stepInfo = null;
  if (stepIndex !== undefined && stepDescription) {
    stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
  }
  this._addNotification('error', title, message, stepInfo, duration);
}

export function showWarning(this: SytoApp, title: string, message: string, options: any = {}) {
  const { duration = 6000 } = options;
  this._addNotification('warning', title, message, null, duration);
}

export function showSuccess(this: SytoApp, message: string, options: any = {}) {
  const { duration = 3000 } = options;
  this._addNotification('success', 'Success', message, null, duration);
}

export function _addNotification(
  this: SytoApp,
  type: string,
  title: string,
  message: string,
  stepInfo: string | null,
  duration: number
) {
  const id = ++this.notificationIdCounter;
  const notification = {
    id,
    type,
    title,
    message,
    stepInfo,
    visible: false,
  };
  this.notifications.push(notification);

  setTimeout(() => {
    const n = this.notifications.find((n) => n.id === id);
    if (n) n.visible = true;
  }, 10);

  if (duration > 0) {
    setTimeout(() => this.dismissNotification(id), duration);
  }
}

export function dismissNotification(this: SytoApp, id: number) {
  const notification = this.notifications.find((n) => n.id === id);
  if (notification) {
    notification.visible = false;
    setTimeout(() => {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    }, 200);
  }
}

export function getNotificationIcon(this: SytoApp, type: string) {
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

export function alert(this: SytoApp, message: string, title = 'Alert'): Promise<boolean> {
  return new Promise((resolve) => {
    this.messageBox = {
      visible: true,
      title,
      message,
      type: 'alert',
      inputValue: '',
      resolve,
    };
  });
}

export function confirm(this: SytoApp, message: string, title = 'Confirm'): Promise<boolean> {
  return new Promise((resolve) => {
    this.messageBox = {
      visible: true,
      title,
      message,
      type: 'confirm',
      inputValue: '',
      resolve,
    };
  });
}

export function prompt(
  this: SytoApp,
  message: string,
  defaultValue = '',
  title = 'Prompt'
): Promise<string | null> {
  return new Promise((resolve) => {
    this.messageBox = {
      visible: true,
      title,
      message,
      type: 'prompt',
      inputValue: defaultValue,
      resolve,
    };
  });
}

export function closeMessageBox(this: SytoApp, result: boolean) {
  const { resolve, type, inputValue } = this.messageBox;
  this.messageBox.visible = false;

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

export function getMessageBoxIcon(this: SytoApp) {
  switch (this.messageBox.type) {
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
