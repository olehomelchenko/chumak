import { describe, it, expect, vi } from 'vitest';
import { isInInteractiveContext, hasModifier } from './EventRouter';

describe('EventRouter', () => {
  describe('isInInteractiveContext', () => {
    it('returns false when no active element', () => {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(false);
    });

    it('returns true for input element', () => {
      const input = document.createElement('input');
      Object.defineProperty(document, 'activeElement', {
        value: input,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(true);
    });

    it('returns true for textarea element', () => {
      const textarea = document.createElement('textarea');
      Object.defineProperty(document, 'activeElement', {
        value: textarea,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(true);
    });

    it('returns true for select element', () => {
      const select = document.createElement('select');
      Object.defineProperty(document, 'activeElement', {
        value: select,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(true);
    });

    it('returns true for contenteditable element', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      Object.defineProperty(document, 'activeElement', {
        value: div,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(true);
    });

    it('returns false for non-interactive elements', () => {
      const div = document.createElement('div');
      Object.defineProperty(document, 'activeElement', {
        value: div,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(false);
    });

    it('returns false for button element', () => {
      const button = document.createElement('button');
      Object.defineProperty(document, 'activeElement', {
        value: button,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(false);
    });

    it('returns true for element inside CodeMirror editor', () => {
      const cmEditor = document.createElement('div');
      cmEditor.classList.add('cm-editor');
      const cmContent = document.createElement('div');
      cmContent.classList.add('cm-content');
      cmEditor.appendChild(cmContent);
      document.body.appendChild(cmEditor);

      Object.defineProperty(document, 'activeElement', {
        value: cmContent,
        writable: true,
        configurable: true,
      });

      expect(isInInteractiveContext()).toBe(true);
      document.body.removeChild(cmEditor);
    });
  });

  describe('hasModifier', () => {
    it('returns true when ctrl is pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true });
      expect(hasModifier(event)).toBe(true);
    });

    it('returns true when meta is pressed', () => {
      const event = new KeyboardEvent('keydown', { metaKey: true });
      expect(hasModifier(event)).toBe(true);
    });

    it('returns true when alt is pressed', () => {
      const event = new KeyboardEvent('keydown', { altKey: true });
      expect(hasModifier(event)).toBe(true);
    });

    it('returns false when no modifier pressed', () => {
      const event = new KeyboardEvent('keydown', {});
      expect(hasModifier(event)).toBe(false);
    });

    it('returns true when shift only is not a modifier', () => {
      const event = new KeyboardEvent('keydown', { shiftKey: true });
      expect(hasModifier(event)).toBe(false);
    });

    it('returns true when multiple modifiers pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, altKey: true });
      expect(hasModifier(event)).toBe(true);
    });
  });
});
