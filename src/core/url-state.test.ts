import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getUrlState, setUrlState, URLState } from './url-state';

describe('URL State', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hash: '',
      href: 'http://localhost:3000/',
    } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('getUrlState()', () => {
    it('should parse dataset info route', () => {
      window.location.hash = '#/src_123/info';
      const state = getUrlState();
      expect(state.sourceId).toBe('src_123');
      expect(state.section).toBe('info');
      expect(state.modelId).toBeUndefined();
    });

    it('should parse model info route', () => {
      window.location.hash = '#/src_123/mdl_456/info';
      const state = getUrlState();
      expect(state.sourceId).toBe('src_123');
      expect(state.modelId).toBe('mdl_456');
      expect(state.section).toBe('info');
    });

    it('should parse regular model route', () => {
      window.location.hash = '#/src_123/mdl_456';
      const state = getUrlState();
      expect(state.sourceId).toBe('src_123');
      expect(state.modelId).toBe('mdl_456');
      expect(state.section).toBeUndefined();
    });

    it('should parse regular source route', () => {
      window.location.hash = '#/src_123';
      const state = getUrlState();
      expect(state.sourceId).toBe('src_123');
      expect(state.modelId).toBeUndefined();
      expect(state.section).toBeUndefined();
    });

    it('should handle empty hash', () => {
      window.location.hash = '';
      const state = getUrlState();
      expect(state.sourceId).toBeUndefined();
      expect(state.modelId).toBeUndefined();
      expect(state.section).toBeUndefined();
    });

    it('should handle special pages', () => {
      window.location.hash = '#/about';
      const state = getUrlState();
      expect(state.page).toBe('about');
      expect(state.sourceId).toBeUndefined();
    });

    it('should not confuse modelId with info section', () => {
      // Edge case: modelId that happens to be "info"
      window.location.hash = '#/src_123/info';
      const state = getUrlState();
      // Should be treated as info section, not modelId
      expect(state.sourceId).toBe('src_123');
      expect(state.section).toBe('info');
      expect(state.modelId).toBeUndefined();
    });
  });

  // Note: setUrlState() tests require full browser environment to verify
  // window.history.replaceState behavior. The function is tested indirectly
  // through integration tests and manual testing.
});
