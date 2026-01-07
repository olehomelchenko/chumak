import { describe, it, expect, beforeEach } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform } from './transforms';

describe('Notification Manager', () => {
  let notificationManager: any;

  function createTestNotificationManager() {
    return {
      notifications: [],
      notificationIdCounter: 0,

      showError(title: string, message: string, options: any = {}) {
        const { stepIndex, stepDescription, duration = 0 } = options;
        let stepInfo = null;
        if (stepIndex !== undefined && stepDescription) {
          stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
        }
        this._addNotification('error', title, message, stepInfo, duration);
      },

      _addNotification(type: string, title: string, message: string, stepInfo: string | null, duration: number) {
        const id = ++this.notificationIdCounter;
        const notification = { id, type, title, message, stepInfo, visible: false };
        this.notifications.push(notification);
      },

      dismissNotification(id: number) {
        const index = this.notifications.findIndex((n: any) => n.id === id);
        if (index !== -1) {
          this.notifications.splice(index, 1);
        }
      },
    };
  }

  beforeEach(() => {
    notificationManager = createTestNotificationManager();
  });

  describe('showError()', () => {
    it('should add error notification', () => {
      notificationManager.showError('Test Error', 'Something went wrong');
      expect(notificationManager.notifications.length).toBe(1);
      expect(notificationManager.notifications[0].type).toBe('error');
    });

    it('should include step info when provided', () => {
      notificationManager.showError('Pipeline Error', 'Column not found', {
        stepIndex: 2,
        stepDescription: 'Filter: sales > 1000',
      });
      expect(notificationManager.notifications[0].stepInfo).toBe('Step 3: Filter: sales > 1000');
    });
  });
});

describe('JSON Editor', () => {
  let jsonEditor: any;

  function createTestJsonEditor() {
    return {
      jsonEditContent: '',
      jsonEditError: null as string | null,
      activeModel: {
        steps: [
          { import: { source: 'test.csv', headerMode: 'first-row' } },
          { filter: 'col2 > 10' },
        ],
      },

      validateJsonEdit() {
        try {
          const parsed = JSON.parse(this.jsonEditContent);
          if (!parsed.transforms || !Array.isArray(parsed.transforms)) {
            this.jsonEditError = 'Invalid structure';
            return false;
          }
          if (parsed.transforms.length === 0 || !parsed.transforms[0].import) {
            this.jsonEditError = 'Missing import';
            return false;
          }
          this.jsonEditError = null;
          return true;
        } catch (error: any) {
          this.jsonEditError = error.message;
          return false;
        }
      },
    };
  }

  beforeEach(() => {
    jsonEditor = createTestJsonEditor();
  });

  describe('validateJsonEdit()', () => {
    it('should reject invalid JSON syntax', () => {
      jsonEditor.jsonEditContent = '{ invalid json }';
      const result = jsonEditor.validateJsonEdit();
      expect(result).toBe(false);
      expect(jsonEditor.jsonEditError).toBeDefined();
    });

    it('should accept valid transformed JSON', () => {
      jsonEditor.jsonEditContent = JSON.stringify({
        transforms: [
          { import: { source: 'test.csv', headerMode: 'first-row' } },
          { filter: 'col > 100' },
        ],
      });
      const result = jsonEditor.validateJsonEdit();
      expect(result).toBe(true);
    });
  });
});

describe('Enhanced Error with Step Info', () => {
  it('should include step context in transforms', () => {
    const table = (aq as any).from([{ a: 1 }]);
    const badTransform = { filter: 'unknownCol > 10' };

    expect(() => {
      applyTransform(table, badTransform, ['a']);
    }).toThrow(/unknownCol/);
  });
});
