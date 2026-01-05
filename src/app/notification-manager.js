/**
 * Notification Manager Module
 *
 * Provides toast notifications for error and success messages
 * Replaces browser alert() calls with user-friendly non-blocking notifications
 *
 * Design based on UX-SPECIFICATION.md Section 11.3 (Success Toast)
 */

/**
 * Create notification manager methods for Alpine component
 * @returns {Object} Notification manager methods
 */
export function createNotificationManager() {
  return {
    /**
     * Array of active notifications
     * @type {Array<{id: number, type: string, title: string, message: string, stepInfo: string|null}>}
     */
    notifications: [],

    /**
     * Counter for unique notification IDs
     * @type {number}
     */
    notificationIdCounter: 0,

    /**
     * Show an error notification
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @param {number} options.stepIndex - Index of the step that failed (optional)
     * @param {string} options.stepDescription - Description of the failed step (optional)
     * @param {number} options.duration - Auto-dismiss duration in ms (default: 0 = no auto-dismiss for errors)
     */
    showError(title, message, options = {}) {
      const { stepIndex, stepDescription, duration = 0 } = options;

      let stepInfo = null;
      if (stepIndex !== undefined && stepDescription) {
        stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
      }

      this._addNotification('error', title, message, stepInfo, duration);
    },

    /**
     * Show a warning notification
     * @param {string} title - Warning title
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @param {number} options.duration - Auto-dismiss duration in ms (default: 6000)
     */
    showWarning(title, message, options = {}) {
      const { duration = 6000 } = options;
      this._addNotification('warning', title, message, null, duration);
    },

    /**
     * Show a success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     * @param {number} options.duration - Auto-dismiss duration in ms (default: 3000)
     */
    showSuccess(message, options = {}) {
      const { duration = 3000 } = options;
      this._addNotification('success', 'Success', message, null, duration);
    },

    /**
     * Internal: Add a notification to the stack
     * @param {string} type - 'error', 'warning', or 'success'
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string|null} stepInfo - Step information for pipeline errors
     * @param {number} duration - Auto-dismiss duration (0 = no auto-dismiss)
     */
    _addNotification(type, title, message, stepInfo, duration) {
      const id = ++this.notificationIdCounter;

      const notification = {
        id,
        type,
        title,
        message,
        stepInfo,
        visible: false, // Start hidden for animation
      };

      this.notifications.push(notification);

      // Trigger animation
      setTimeout(() => {
        const n = this.notifications.find((n) => n.id === id);
        if (n) n.visible = true;
      }, 10);

      // Auto-dismiss if duration is set
      if (duration > 0) {
        setTimeout(() => this.dismissNotification(id), duration);
      }
    },

    /**
     * Dismiss a notification
     * @param {number} id - Notification ID to dismiss
     */
    dismissNotification(id) {
      const notification = this.notifications.find((n) => n.id === id);
      if (notification) {
        notification.visible = false;
        // Remove from array after animation completes
        setTimeout(() => {
          this.notifications = this.notifications.filter((n) => n.id !== id);
        }, 200);
      }
    },

    /**
     * Get notification icon based on type
     * @param {string} type - Notification type
     * @returns {string} Icon character
     */
    getNotificationIcon(type) {
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
    },
  };
}
