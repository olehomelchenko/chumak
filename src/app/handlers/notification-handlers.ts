import type { ChumakApp } from '../../chumak-app';

export function showError(this: ChumakApp, title: string, message: string, options: any = {}) {
  const { stepIndex, stepDescription, duration = 0 } = options;
  let stepInfo = null;
  if (stepIndex !== undefined && stepDescription) {
    stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
  }
  this._addNotification('error', title, message, stepInfo, duration);
}

export function showWarning(this: ChumakApp, title: string, message: string, options: any = {}) {
  const { duration = 6000 } = options;
  this._addNotification('warning', title, message, null, duration);
}

export function showSuccess(this: ChumakApp, message: string, options: any = {}) {
  const { duration = 3000 } = options;
  this._addNotification('success', 'Success', message, null, duration);
}

export function _addNotification(
  this: ChumakApp,
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

export function dismissNotification(this: ChumakApp, id: number) {
  const notification = this.notifications.find((n) => n.id === id);
  if (notification) {
    notification.visible = false;
    setTimeout(() => {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    }, 200);
  }
}

export function getNotificationIcon(this: ChumakApp, type: string) {
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

export function alert(this: ChumakApp, message: string, title = 'Alert'): Promise<boolean> {
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

export function confirm(this: ChumakApp, message: string, title = 'Confirm'): Promise<boolean> {
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
  this: ChumakApp,
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

export function closeMessageBox(this: ChumakApp, result: boolean) {
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

export function getMessageBoxIcon(this: ChumakApp) {
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
