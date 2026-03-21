import { describe, it, expect, beforeEach } from 'vitest';
import { AppStore } from '../stores/AppStore';
import { NameService } from './NameService';
import { createTestSource, createTestModel } from '../handlers/test-utils';

describe('NameService', () => {
  beforeEach(() => {
    AppStore.reset();
  });

  describe('isSourceNameTaken', () => {
    it('returns false when no sources exist', () => {
      expect(NameService.isSourceNameTaken('orders')).toBe(false);
    });

    it('returns true for exact match', () => {
      AppStore.sources.value = [createTestSource({ id: 'src_1', name: 'orders' })];
      expect(NameService.isSourceNameTaken('orders')).toBe(true);
    });

    it('is case-insensitive', () => {
      AppStore.sources.value = [createTestSource({ id: 'src_1', name: 'Orders' })];
      expect(NameService.isSourceNameTaken('orders')).toBe(true);
      expect(NameService.isSourceNameTaken('ORDERS')).toBe(true);
    });

    it('excludes specified ID (for rename)', () => {
      AppStore.sources.value = [createTestSource({ id: 'src_1', name: 'orders' })];
      expect(NameService.isSourceNameTaken('orders', 'src_1')).toBe(false);
    });

    it('still detects conflict with different ID when excluding', () => {
      AppStore.sources.value = [
        createTestSource({ id: 'src_1', name: 'orders' }),
        createTestSource({ id: 'src_2', name: 'customers' }),
      ];
      expect(NameService.isSourceNameTaken('orders', 'src_2')).toBe(true);
    });
  });

  describe('isModelNameTaken', () => {
    it('returns false when no models exist', () => {
      expect(NameService.isModelNameTaken('main', 'src_1')).toBe(false);
    });

    it('returns true for exact match within same source', () => {
      AppStore.models.value = [createTestModel({ id: 'mdl_1', name: 'main', sourceId: 'src_1' })];
      expect(NameService.isModelNameTaken('main', 'src_1')).toBe(true);
    });

    it('is case-insensitive', () => {
      AppStore.models.value = [
        createTestModel({ id: 'mdl_1', name: 'Clean Orders', sourceId: 'src_1' }),
      ];
      expect(NameService.isModelNameTaken('clean orders', 'src_1')).toBe(true);
      expect(NameService.isModelNameTaken('CLEAN ORDERS', 'src_1')).toBe(true);
    });

    it('allows same name under different sources', () => {
      AppStore.models.value = [
        createTestModel({ id: 'mdl_1', name: 'main', sourceId: 'src_1' }),
        createTestModel({ id: 'mdl_2', name: 'report', sourceId: 'src_2' }),
      ];
      // 'main' exists under src_1 but not src_2
      expect(NameService.isModelNameTaken('main', 'src_1')).toBe(true);
      expect(NameService.isModelNameTaken('main', 'src_2')).toBe(false);
    });

    it('excludes specified ID (for rename)', () => {
      AppStore.models.value = [createTestModel({ id: 'mdl_1', name: 'main', sourceId: 'src_1' })];
      expect(NameService.isModelNameTaken('main', 'src_1', 'mdl_1')).toBe(false);
    });
  });

  describe('suggestUniqueName', () => {
    it('returns baseName when not taken', () => {
      const result = NameService.suggestUniqueName('orders', () => false);
      expect(result).toBe('orders');
    });

    it('appends -2 when baseName is taken', () => {
      const taken = new Set(['orders']);
      const result = NameService.suggestUniqueName('orders', (n) => taken.has(n.toLowerCase()));
      expect(result).toBe('orders-2');
    });

    it('increments suffix until unique', () => {
      const taken = new Set(['orders', 'orders-2', 'orders-3']);
      const result = NameService.suggestUniqueName('orders', (n) => taken.has(n.toLowerCase()));
      expect(result).toBe('orders-4');
    });

    it('works with source name checking', () => {
      AppStore.sources.value = [
        createTestSource({ id: 'src_1', name: 'data' }),
        createTestSource({ id: 'src_2', name: 'data-2' }),
      ];
      const result = NameService.suggestUniqueName('data', (n) => NameService.isSourceNameTaken(n));
      expect(result).toBe('data-3');
    });

    it('works with model name checking (per source)', () => {
      AppStore.models.value = [
        createTestModel({ id: 'mdl_1', name: 'main', sourceId: 'src_1' }),
        createTestModel({ id: 'mdl_2', name: 'main-2', sourceId: 'src_1' }),
      ];
      const result = NameService.suggestUniqueName('main', (n) =>
        NameService.isModelNameTaken(n, 'src_1')
      );
      expect(result).toBe('main-3');
    });

    it('returns baseName for model if name taken under different source', () => {
      AppStore.models.value = [createTestModel({ id: 'mdl_1', name: 'main', sourceId: 'src_1' })];
      const result = NameService.suggestUniqueName('main', (n) =>
        NameService.isModelNameTaken(n, 'src_2')
      );
      expect(result).toBe('main');
    });
  });
});
