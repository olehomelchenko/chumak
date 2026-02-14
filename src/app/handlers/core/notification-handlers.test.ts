import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { resetStores } from '../test-utils';
import {
  showError,
  showWarning,
  showSuccess,
  dismissNotification,
  getNotificationIcon,
  alert,
  confirm,
  prompt,
  closeMessageBox,
  getMessageBoxIcon,
} from './notification-handlers';

describe('notification-handlers', () => {
  beforeEach(() => {
    resetStores();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('showError', () => {
    it('adds error notification to store', () => {
      showError('Error Title', 'Something went wrong');

      expect(AppStore.notifications.value).toHaveLength(1);
      const notif = AppStore.notifications.value[0];
      expect(notif.type).toBe('error');
      expect(notif.title).toBe('Error Title');
      expect(notif.message).toBe('Something went wrong');
    });

    it('includes step info when provided', () => {
      showError('Error', 'Failed', { stepIndex: 2, stepDescription: 'Filter' });

      const notif = AppStore.notifications.value[0];
      expect(notif.stepInfo).toBe('Step 3: Filter');
    });

    it('sets stepInfo to null when no step info provided', () => {
      showError('Error', 'Failed');

      const notif = AppStore.notifications.value[0];
      expect(notif.stepInfo).toBeNull();
    });

    it('defaults duration to 0 (persistent)', () => {
      showError('Error', 'Failed');

      // With duration 0, no auto-dismiss timeout is set
      vi.advanceTimersByTime(10000);
      // Notification should still be present (though visibility may have changed)
      expect(AppStore.notifications.value.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('showWarning', () => {
    it('adds warning notification', () => {
      showWarning('Warning Title', 'Be careful');

      const notif = AppStore.notifications.value[0];
      expect(notif.type).toBe('warning');
      expect(notif.title).toBe('Warning Title');
    });
  });

  describe('showSuccess', () => {
    it('adds success notification with "Success" title', () => {
      showSuccess('Operation completed');

      const notif = AppStore.notifications.value[0];
      expect(notif.type).toBe('success');
      expect(notif.title).toBe('Success');
      expect(notif.message).toBe('Operation completed');
    });
  });

  describe('notification visibility animation', () => {
    it('notification starts invisible then becomes visible after delay', () => {
      showSuccess('Test');

      expect(AppStore.notifications.value[0].visible).toBe(false);

      vi.advanceTimersByTime(10);

      expect(AppStore.notifications.value[0].visible).toBe(true);
    });
  });

  describe('notification id counter', () => {
    it('increments id for each notification', () => {
      showSuccess('First');
      showSuccess('Second');
      showSuccess('Third');

      expect(AppStore.notifications.value[0].id).toBe(1);
      expect(AppStore.notifications.value[1].id).toBe(2);
      expect(AppStore.notifications.value[2].id).toBe(3);
    });
  });

  describe('dismissNotification', () => {
    it('marks notification as not visible then removes it', () => {
      showSuccess('Test');
      vi.advanceTimersByTime(10); // make visible
      const id = AppStore.notifications.value[0].id;

      dismissNotification(id);

      // Immediately marked not visible
      expect(AppStore.notifications.value[0].visible).toBe(false);

      // Removed after animation delay
      vi.advanceTimersByTime(200);
      expect(AppStore.notifications.value).toHaveLength(0);
    });
  });

  describe('getNotificationIcon', () => {
    it('returns warning icon for error', () => {
      expect(getNotificationIcon('error')).toBe('⚠️');
    });

    it('returns lightning for warning', () => {
      expect(getNotificationIcon('warning')).toBe('⚡');
    });

    it('returns checkmark for success', () => {
      expect(getNotificationIcon('success')).toBe('✓');
    });

    it('returns info icon for unknown type', () => {
      expect(getNotificationIcon('unknown')).toBe('ℹ️');
    });
  });

  describe('alert', () => {
    it('sets messageBox to visible with alert type', () => {
      alert('Something happened');

      expect(AppStore.messageBox.value.visible).toBe(true);
      expect(AppStore.messageBox.value.type).toBe('alert');
      expect(AppStore.messageBox.value.message).toBe('Something happened');
      expect(AppStore.messageBox.value.title).toBe('Alert');
    });

    it('uses custom title', () => {
      alert('Message', 'Custom Title');

      expect(AppStore.messageBox.value.title).toBe('Custom Title');
    });

    it('returns a promise', () => {
      const result = alert('Test');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('confirm', () => {
    it('sets messageBox with confirm type', () => {
      confirm('Are you sure?');

      expect(AppStore.messageBox.value.visible).toBe(true);
      expect(AppStore.messageBox.value.type).toBe('confirm');
      expect(AppStore.messageBox.value.message).toBe('Are you sure?');
    });
  });

  describe('prompt', () => {
    it('sets messageBox with prompt type and default value', () => {
      prompt('Enter name', 'John');

      expect(AppStore.messageBox.value.visible).toBe(true);
      expect(AppStore.messageBox.value.type).toBe('prompt');
      expect(AppStore.messageBox.value.inputValue).toBe('John');
    });

    it('uses empty string as default value', () => {
      prompt('Enter name');

      expect(AppStore.messageBox.value.inputValue).toBe('');
    });
  });

  describe('closeMessageBox', () => {
    it('closes the message box', () => {
      alert('Test');
      expect(AppStore.messageBox.value.visible).toBe(true);

      closeMessageBox(true);

      expect(AppStore.messageBox.value.visible).toBe(false);
    });

    it('resolves alert promise with true', async () => {
      const promise = alert('Test');

      closeMessageBox(true);

      await expect(promise).resolves.toBe(true);
    });

    it('resolves alert with true even when result is false', async () => {
      const promise = alert('Test');

      closeMessageBox(false);

      await expect(promise).resolves.toBe(true);
    });

    it('resolves confirm with true when accepted', async () => {
      const promise = confirm('Sure?');

      closeMessageBox(true);

      await expect(promise).resolves.toBe(true);
    });

    it('resolves confirm with false when declined', async () => {
      const promise = confirm('Sure?');

      closeMessageBox(false);

      await expect(promise).resolves.toBe(false);
    });

    it('resolves prompt with input value when accepted', async () => {
      const promise = prompt('Name', 'default');
      AppStore.messageBox.value = {
        ...AppStore.messageBox.value,
        inputValue: 'Alice',
      };

      closeMessageBox(true);

      await expect(promise).resolves.toBe('Alice');
    });

    it('resolves prompt with null when cancelled', async () => {
      const promise = prompt('Name', 'default');

      closeMessageBox(false);

      await expect(promise).resolves.toBeNull();
    });
  });

  describe('getMessageBoxIcon', () => {
    it('returns info icon for alert', () => {
      alert('Test');
      expect(getMessageBoxIcon()).toBe('carbon:information-filled');
    });

    it('returns help icon for confirm', () => {
      confirm('Test');
      expect(getMessageBoxIcon()).toBe('carbon:help-filled');
    });

    it('returns edit icon for prompt', () => {
      prompt('Test');
      expect(getMessageBoxIcon()).toBe('carbon:edit');
    });
  });
});
