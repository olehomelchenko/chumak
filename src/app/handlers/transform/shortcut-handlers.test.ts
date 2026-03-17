import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { resetStores } from '../test-utils';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);

import { executeShortcut, SHORTCUT_REGISTRY } from './shortcut-handlers';
import { StepService } from '../../services/StepService';

const callbacks = { onError: vi.fn() };

function expectTransform(label: string, spec: Record<string, any>) {
  expect(StepService.runTransform).toHaveBeenCalledWith(label, spec, callbacks);
}

describe('shortcut-handlers', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  // ============================================================
  // Registry completeness
  // ============================================================

  describe('registry', () => {
    it('contains all expected shortcut IDs', () => {
      const ids = SHORTCUT_REGISTRY.map((s) => s.id);
      expect(ids).toContain('duplicate');
      expect(ids).toContain('upper');
      expect(ids).toContain('lower');
      expect(ids).toContain('titlecase');
      expect(ids).toContain('trim');
      expect(ids).toContain('len');
      expect(ids).toContain('extractYear');
      expect(ids).toContain('extractWeek');
      expect(ids).toContain('truncYear');
      expect(ids).toContain('truncDay');
      expect(ids).toContain('round');
      expect(ids).toContain('sign');
      expect(ids).toContain('convertToString');
      expect(ids).toContain('convertToDate');
    });

    it('has no duplicate IDs', () => {
      const ids = SHORTCUT_REGISTRY.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ============================================================
  // Common behavior: no-op when no column selected
  // ============================================================

  describe('no column selected', () => {
    it('does nothing for derive shortcuts when selectedColumn is null', async () => {
      await executeShortcut('upper', callbacks);
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('does nothing for convert shortcuts when selectedColumn is null', async () => {
      await executeShortcut('convertToString', callbacks);
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('does nothing for unknown shortcut ID', async () => {
      AppStore.selectedColumn.value = 'col';
      await executeShortcut('nonexistent', callbacks);
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Column shortcuts
  // ============================================================

  describe('duplicate', () => {
    it('creates a derive with _copy suffix', async () => {
      AppStore.selectedColumn.value = 'name';
      await executeShortcut('duplicate', callbacks);
      expectTransform('Duplicate', { derive: { name_copy: '[name]' } });
    });

    it('clears selectedColumn after apply', async () => {
      AppStore.selectedColumn.value = 'name';
      await executeShortcut('duplicate', callbacks);
      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('handles column names with special characters', async () => {
      AppStore.selectedColumn.value = 'full name';
      await executeShortcut('duplicate', callbacks);
      expectTransform('Duplicate', { derive: { 'full name_copy': '[full name]' } });
    });
  });

  // ============================================================
  // Text shortcuts
  // ============================================================

  describe('text shortcuts', () => {
    it('upper wraps in upper()', async () => {
      AppStore.selectedColumn.value = 'city';
      await executeShortcut('upper', callbacks);
      expectTransform('Uppercase', { derive: { city: 'upper([city])' } });
    });

    it('lower wraps in lower()', async () => {
      AppStore.selectedColumn.value = 'city';
      await executeShortcut('lower', callbacks);
      expectTransform('Lowercase', { derive: { city: 'lower([city])' } });
    });

    it('titlecase wraps in titlecase()', async () => {
      AppStore.selectedColumn.value = 'city';
      await executeShortcut('titlecase', callbacks);
      expectTransform('Title Case', { derive: { city: 'titlecase([city])' } });
    });

    it('trim wraps in trim()', async () => {
      AppStore.selectedColumn.value = 'city';
      await executeShortcut('trim', callbacks);
      expectTransform('Trim', { derive: { city: 'trim([city])' } });
    });

    it('len creates _len column', async () => {
      AppStore.selectedColumn.value = 'city';
      await executeShortcut('len', callbacks);
      expectTransform('Length', { derive: { city_len: 'len([city])' } });
    });

    it('quotes column names with special characters', async () => {
      AppStore.selectedColumn.value = 'first name';
      await executeShortcut('upper', callbacks);
      expectTransform('Uppercase', { derive: { 'first name': 'upper([first name])' } });
    });
  });

  // ============================================================
  // Date extract shortcuts
  // ============================================================

  describe('date extract shortcuts', () => {
    it('extractYear', async () => {
      AppStore.selectedColumn.value = 'date';
      await executeShortcut('extractYear', callbacks);
      expectTransform('Extract Year', { derive: { date_year: 'year([date])' } });
    });

    it('extractMonth', async () => {
      AppStore.selectedColumn.value = 'date';
      await executeShortcut('extractMonth', callbacks);
      expectTransform('Extract Month', { derive: { date_month: 'month([date])' } });
    });

    it('extractDay', async () => {
      AppStore.selectedColumn.value = 'date';
      await executeShortcut('extractDay', callbacks);
      expectTransform('Extract Day', { derive: { date_day: 'day([date])' } });
    });

    it('extractQuarter', async () => {
      AppStore.selectedColumn.value = 'date';
      await executeShortcut('extractQuarter', callbacks);
      expectTransform('Extract Quarter', { derive: { date_quarter: 'quarter([date])' } });
    });

    it('extractWeekday', async () => {
      AppStore.selectedColumn.value = 'date';
      await executeShortcut('extractWeekday', callbacks);
      expectTransform('Extract Weekday', { derive: { date_weekday: 'weekday([date])' } });
    });

    it('extractWeek', async () => {
      AppStore.selectedColumn.value = 'date';
      await executeShortcut('extractWeek', callbacks);
      expectTransform('Extract Week', { derive: { date_week: 'week([date])' } });
    });
  });

  // ============================================================
  // Date truncate shortcuts
  // ============================================================

  describe('date truncate shortcuts', () => {
    it('truncYear', async () => {
      AppStore.selectedColumn.value = 'ts';
      await executeShortcut('truncYear', callbacks);
      expectTransform('Truncate to Year', {
        derive: { ts_year_trunc: 'date_trunc([ts], "year")' },
      });
    });

    it('truncMonth', async () => {
      AppStore.selectedColumn.value = 'ts';
      await executeShortcut('truncMonth', callbacks);
      expectTransform('Truncate to Month', {
        derive: { ts_month_trunc: 'date_trunc([ts], "month")' },
      });
    });

    it('truncWeek', async () => {
      AppStore.selectedColumn.value = 'ts';
      await executeShortcut('truncWeek', callbacks);
      expectTransform('Truncate to Week', {
        derive: { ts_week_trunc: 'date_trunc([ts], "week")' },
      });
    });

    it('truncDay', async () => {
      AppStore.selectedColumn.value = 'ts';
      await executeShortcut('truncDay', callbacks);
      expectTransform('Truncate to Day', {
        derive: { ts_day_trunc: 'date_trunc([ts], "day")' },
      });
    });
  });

  // ============================================================
  // Number shortcuts
  // ============================================================

  describe('number shortcuts', () => {
    it('round', async () => {
      AppStore.selectedColumn.value = 'price';
      await executeShortcut('round', callbacks);
      expectTransform('Round', { derive: { price: 'round([price])' } });
    });

    it('floor', async () => {
      AppStore.selectedColumn.value = 'price';
      await executeShortcut('floor', callbacks);
      expectTransform('Floor', { derive: { price: 'floor([price])' } });
    });

    it('ceil', async () => {
      AppStore.selectedColumn.value = 'price';
      await executeShortcut('ceil', callbacks);
      expectTransform('Ceiling', { derive: { price: 'ceil([price])' } });
    });

    it('trunc', async () => {
      AppStore.selectedColumn.value = 'price';
      await executeShortcut('trunc', callbacks);
      expectTransform('Truncate Decimals', { derive: { price: 'trunc([price])' } });
    });

    it('abs', async () => {
      AppStore.selectedColumn.value = 'balance';
      await executeShortcut('abs', callbacks);
      expectTransform('Absolute Value', { derive: { balance: 'abs([balance])' } });
    });

    it('sign creates _sign column', async () => {
      AppStore.selectedColumn.value = 'balance';
      await executeShortcut('sign', callbacks);
      expectTransform('Sign', { derive: { balance_sign: 'sign([balance])' } });
    });
  });

  // ============================================================
  // Convert shortcuts
  // ============================================================

  describe('convert shortcuts', () => {
    it('convertToString', async () => {
      AppStore.selectedColumn.value = 'age';
      await executeShortcut('convertToString', callbacks);
      expectTransform('Convert to Text', { types: { age: 'string' } });
    });

    it('convertToNumber', async () => {
      AppStore.selectedColumn.value = 'amount';
      await executeShortcut('convertToNumber', callbacks);
      expectTransform('Convert to Number', { types: { amount: 'float' } });
    });

    it('convertToInteger', async () => {
      AppStore.selectedColumn.value = 'count';
      await executeShortcut('convertToInteger', callbacks);
      expectTransform('Convert to Integer', { types: { count: 'integer' } });
    });

    it('convertToDate', async () => {
      AppStore.selectedColumn.value = 'created';
      await executeShortcut('convertToDate', callbacks);
      expectTransform('Convert to Date', { types: { created: 'date' } });
    });

    it('clears selectedColumn after convert', async () => {
      AppStore.selectedColumn.value = 'age';
      await executeShortcut('convertToString', callbacks);
      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('does nothing when no column selected', async () => {
      await executeShortcut('convertToString', callbacks);
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });
  });
});
