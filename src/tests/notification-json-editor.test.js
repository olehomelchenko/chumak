/**
 * Tests for notification manager and JSON editor functionality
 */

describe('Notification Manager', () => {
  let notificationManager;

  // Minimal implementation of createNotificationManager for testing
  function createTestNotificationManager() {
    return {
      notifications: [],
      notificationIdCounter: 0,

      showError(title, message, options = {}) {
        const { stepIndex, stepDescription, duration = 0 } = options;
        let stepInfo = null;
        if (stepIndex !== undefined && stepDescription) {
          stepInfo = `Step ${stepIndex + 1}: ${stepDescription}`;
        }
        this._addNotification('error', title, message, stepInfo, duration);
      },

      showWarning(title, message, options = {}) {
        const { duration = 6000 } = options;
        this._addNotification('warning', title, message, null, duration);
      },

      showSuccess(message, options = {}) {
        const { duration = 3000 } = options;
        this._addNotification('success', 'Success', message, null, duration);
      },

      _addNotification(type, title, message, stepInfo, duration) {
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
      },

      dismissNotification(id) {
        const index = this.notifications.findIndex((n) => n.id === id);
        if (index !== -1) {
          this.notifications.splice(index, 1);
        }
      },

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

  beforeEach(() => {
    notificationManager = createTestNotificationManager();
  });

  describe('showError()', () => {
    it('should add error notification with title and message', () => {
      notificationManager.showError('Test Error', 'Something went wrong');

      expect(notificationManager.notifications.length).to.equal(1);
      expect(notificationManager.notifications[0].type).to.equal('error');
      expect(notificationManager.notifications[0].title).to.equal('Test Error');
      expect(notificationManager.notifications[0].message).to.equal('Something went wrong');
    });

    it('should include step info when provided', () => {
      notificationManager.showError('Pipeline Error', 'Column not found', {
        stepIndex: 2,
        stepDescription: 'Filter: sales > 1000',
      });

      expect(notificationManager.notifications[0].stepInfo).to.equal(
        'Step 3: Filter: sales > 1000'
      );
    });

    it('should not include step info when stepIndex is not provided', () => {
      notificationManager.showError('Error', 'Some error');
      expect(notificationManager.notifications[0].stepInfo).to.be.null;
    });
  });

  describe('showWarning()', () => {
    it('should add warning notification', () => {
      notificationManager.showWarning('Warning Title', 'This is a warning');

      expect(notificationManager.notifications.length).to.equal(1);
      expect(notificationManager.notifications[0].type).to.equal('warning');
      expect(notificationManager.notifications[0].title).to.equal('Warning Title');
    });
  });

  describe('showSuccess()', () => {
    it('should add success notification with "Success" title', () => {
      notificationManager.showSuccess('Operation completed');

      expect(notificationManager.notifications.length).to.equal(1);
      expect(notificationManager.notifications[0].type).to.equal('success');
      expect(notificationManager.notifications[0].title).to.equal('Success');
      expect(notificationManager.notifications[0].message).to.equal('Operation completed');
    });
  });

  describe('dismissNotification()', () => {
    it('should remove notification by ID', () => {
      notificationManager.showError('Error 1', 'Message 1');
      notificationManager.showError('Error 2', 'Message 2');

      const idToRemove = notificationManager.notifications[0].id;
      notificationManager.dismissNotification(idToRemove);

      expect(notificationManager.notifications.length).to.equal(1);
      expect(notificationManager.notifications[0].title).to.equal('Error 2');
    });

    it('should handle dismissing non-existent ID', () => {
      notificationManager.showError('Error', 'Message');
      notificationManager.dismissNotification(999);

      expect(notificationManager.notifications.length).to.equal(1);
    });
  });

  describe('getNotificationIcon()', () => {
    it('should return correct icon for error type', () => {
      expect(notificationManager.getNotificationIcon('error')).to.equal('⚠️');
    });

    it('should return correct icon for warning type', () => {
      expect(notificationManager.getNotificationIcon('warning')).to.equal('⚡');
    });

    it('should return correct icon for success type', () => {
      expect(notificationManager.getNotificationIcon('success')).to.equal('✓');
    });

    it('should return info icon for unknown type', () => {
      expect(notificationManager.getNotificationIcon('unknown')).to.equal('ℹ️');
    });
  });

  describe('Unique IDs', () => {
    it('should assign unique incrementing IDs to notifications', () => {
      notificationManager.showError('Error 1', 'Message 1');
      notificationManager.showError('Error 2', 'Message 2');
      notificationManager.showSuccess('Done');

      expect(notificationManager.notifications[0].id).to.equal(1);
      expect(notificationManager.notifications[1].id).to.equal(2);
      expect(notificationManager.notifications[2].id).to.equal(3);
    });
  });
});

describe('JSON Editor', () => {
  let jsonEditor;

  function createTestJsonEditor() {
    return {
      jsonEditMode: false,
      jsonEditContent: '',
      jsonEditError: null,
      jsonEditBackup: null,
      activeModel: {
        steps: [
          { import: { source: 'test.csv', headerMode: 'first-row' } },
          { types: { col1: 'string', col2: 'integer' } },
          { filter: 'col2 > 10' },
        ],
      },

      getStepsJson() {
        if (!this.activeModel?.steps) return '';
        return JSON.stringify({ transforms: this.activeModel.steps }, null, 2);
      },

      enterJsonEditMode() {
        if (!this.activeModel?.steps) return;
        this.jsonEditBackup = JSON.parse(JSON.stringify(this.activeModel.steps));
        this.jsonEditContent = this.getStepsJson();
        this.jsonEditError = null;
        this.jsonEditMode = true;
      },

      cancelJsonEdit() {
        this.jsonEditMode = false;
        this.jsonEditContent = '';
        this.jsonEditError = null;
        this.jsonEditBackup = null;
      },

      validateJsonEdit() {
        try {
          const parsed = JSON.parse(this.jsonEditContent);

          if (!parsed.transforms || !Array.isArray(parsed.transforms)) {
            this.jsonEditError = 'Invalid structure: Expected { "transforms": [...] }';
            return false;
          }

          if (parsed.transforms.length === 0) {
            this.jsonEditError = 'At least one step (import) is required';
            return false;
          }

          if (!parsed.transforms[0].import) {
            this.jsonEditError = 'First step must be an import step';
            return false;
          }

          this.jsonEditError = null;
          return true;
        } catch (error) {
          this.jsonEditError = `JSON syntax error: ${error.message}`;
          return false;
        }
      },
    };
  }

  beforeEach(() => {
    jsonEditor = createTestJsonEditor();
  });

  describe('getStepsJson()', () => {
    it('should return JSON string of current steps', () => {
      const json = jsonEditor.getStepsJson();
      const parsed = JSON.parse(json);

      expect(parsed).to.have.property('transforms');
      expect(parsed.transforms.length).to.equal(3);
      expect(parsed.transforms[0]).to.have.property('import');
    });

    it('should return empty string when no active model', () => {
      jsonEditor.activeModel = null;
      expect(jsonEditor.getStepsJson()).to.equal('');
    });
  });

  describe('enterJsonEditMode()', () => {
    it('should enter edit mode and backup steps', () => {
      jsonEditor.enterJsonEditMode();

      expect(jsonEditor.jsonEditMode).to.be.true;
      expect(jsonEditor.jsonEditBackup).to.deep.equal(jsonEditor.activeModel.steps);
      expect(jsonEditor.jsonEditContent).to.equal(jsonEditor.getStepsJson());
    });

    it('should not enter edit mode when no active model', () => {
      jsonEditor.activeModel = null;
      jsonEditor.enterJsonEditMode();

      expect(jsonEditor.jsonEditMode).to.be.false;
    });
  });

  describe('cancelJsonEdit()', () => {
    it('should reset all edit state', () => {
      jsonEditor.enterJsonEditMode();
      jsonEditor.jsonEditContent = 'modified';
      jsonEditor.jsonEditError = 'some error';

      jsonEditor.cancelJsonEdit();

      expect(jsonEditor.jsonEditMode).to.be.false;
      expect(jsonEditor.jsonEditContent).to.equal('');
      expect(jsonEditor.jsonEditError).to.be.null;
      expect(jsonEditor.jsonEditBackup).to.be.null;
    });
  });

  describe('validateJsonEdit()', () => {
    it('should return true for valid JSON structure', () => {
      jsonEditor.enterJsonEditMode();
      const result = jsonEditor.validateJsonEdit();

      expect(result).to.be.true;
      expect(jsonEditor.jsonEditError).to.be.null;
    });

    it('should reject invalid JSON syntax', () => {
      jsonEditor.jsonEditContent = '{ invalid json }';
      const result = jsonEditor.validateJsonEdit();

      expect(result).to.be.false;
      expect(jsonEditor.jsonEditError).to.include('JSON syntax error');
    });

    it('should reject when transforms array is missing', () => {
      jsonEditor.jsonEditContent = '{ "steps": [] }';
      const result = jsonEditor.validateJsonEdit();

      expect(result).to.be.false;
      expect(jsonEditor.jsonEditError).to.include('Invalid structure');
    });

    it('should reject when transforms is empty', () => {
      jsonEditor.jsonEditContent = '{ "transforms": [] }';
      const result = jsonEditor.validateJsonEdit();

      expect(result).to.be.false;
      expect(jsonEditor.jsonEditError).to.include('At least one step');
    });

    it('should reject when first step is not an import', () => {
      jsonEditor.jsonEditContent = JSON.stringify({
        transforms: [{ filter: 'col > 10' }],
      });
      const result = jsonEditor.validateJsonEdit();

      expect(result).to.be.false;
      expect(jsonEditor.jsonEditError).to.include('First step must be an import');
    });

    it('should accept valid transformed JSON', () => {
      jsonEditor.jsonEditContent = JSON.stringify({
        transforms: [
          { import: { source: 'test.csv', headerMode: 'first-row' } },
          { filter: 'col > 100' },
        ],
      });
      const result = jsonEditor.validateJsonEdit();

      expect(result).to.be.true;
      expect(jsonEditor.jsonEditError).to.be.null;
    });
  });
});

describe('Enhanced Error with Step Info', () => {
  it('should include step index in error thrown during transform', () => {
    const sourceData = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];
    const table = aq.from(sourceData);
    const columns = ['name', 'age'];

    // Use an expression that references unknown column
    const badTransform = { filter: 'unknownCol > 10' };

    let thrownError = null;
    try {
      applyTransform(table, badTransform, columns);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).to.not.be.null;
    // The raw transform error should contain info about unknown column
    expect(thrownError.message).to.include('unknownCol');
  });

  it('describeTransform should return human-readable step description', () => {
    const filterStep = { filter: 'sales > 1000 && region == "North"' };
    expect(describeTransform(filterStep)).to.equal('Filter: sales > 1000 && region == "No...');

    const selectStep = { select: ['col1', 'col2', 'col3'] };
    expect(describeTransform(selectStep)).to.equal('Select: 3 columns');

    const deriveStep = { derive: { profit: 'revenue - cost' } };
    expect(describeTransform(deriveStep)).to.equal('Derive: profit');

    const renameStep = { rename: { old: 'new' } };
    expect(describeTransform(renameStep)).to.equal('Rename: 1 column');
  });
});
