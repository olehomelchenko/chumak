import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { resetStores } from '../test-utils';

vi.mock('../../services/StepService', () => ({
  StepService: {
    runTransform: vi.fn().mockResolvedValue(true),
  },
}));

import {
  quickDuplicate,
  quickUpper,
  quickLower,
  quickTitlecase,
  quickTrim,
  quickLen,
  quickExtractYear,
  quickExtractMonth,
  quickExtractDay,
  quickExtractQuarter,
  quickExtractWeekday,
  quickExtractWeek,
  quickTruncYear,
  quickTruncMonth,
  quickTruncWeek,
  quickTruncDay,
  quickRound,
  quickFloor,
  quickCeil,
  quickTrunc,
  quickAbs,
  quickSign,
  quickConvertToString,
  quickConvertToNumber,
  quickConvertToInteger,
  quickConvertToDate,
} from './shortcut-handlers';
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
  // Common behavior: no-op when no column selected
  // ============================================================

  describe('no column selected', () => {
    it('does nothing when selectedColumn is null', async () => {
      await quickUpper(callbacks);
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Column shortcuts
  // ============================================================

  describe('quickDuplicate', () => {
    it('creates a derive with _copy suffix', async () => {
      AppStore.selectedColumn.value = 'name';
      await quickDuplicate(callbacks);
      expectTransform('Duplicate', { derive: { name_copy: '[name]' } });
    });

    it('clears selectedColumn after apply', async () => {
      AppStore.selectedColumn.value = 'name';
      await quickDuplicate(callbacks);
      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('handles column names with special characters', async () => {
      AppStore.selectedColumn.value = 'full name';
      await quickDuplicate(callbacks);
      expectTransform('Duplicate', { derive: { 'full name_copy': '[full name]' } });
    });
  });

  // ============================================================
  // Text shortcuts
  // ============================================================

  describe('text shortcuts', () => {
    it('quickUpper wraps in upper()', async () => {
      AppStore.selectedColumn.value = 'city';
      await quickUpper(callbacks);
      expectTransform('Uppercase', { derive: { city: 'upper([city])' } });
    });

    it('quickLower wraps in lower()', async () => {
      AppStore.selectedColumn.value = 'city';
      await quickLower(callbacks);
      expectTransform('Lowercase', { derive: { city: 'lower([city])' } });
    });

    it('quickTitlecase wraps in titlecase()', async () => {
      AppStore.selectedColumn.value = 'city';
      await quickTitlecase(callbacks);
      expectTransform('Title Case', { derive: { city: 'titlecase([city])' } });
    });

    it('quickTrim wraps in trim()', async () => {
      AppStore.selectedColumn.value = 'city';
      await quickTrim(callbacks);
      expectTransform('Trim', { derive: { city: 'trim([city])' } });
    });

    it('quickLen creates _len column', async () => {
      AppStore.selectedColumn.value = 'city';
      await quickLen(callbacks);
      expectTransform('Length', { derive: { city_len: 'len([city])' } });
    });

    it('quotes column names with special characters', async () => {
      AppStore.selectedColumn.value = 'first name';
      await quickUpper(callbacks);
      expectTransform('Uppercase', { derive: { 'first name': 'upper([first name])' } });
    });
  });

  // ============================================================
  // Date extract shortcuts
  // ============================================================

  describe('date extract shortcuts', () => {
    it('quickExtractYear', async () => {
      AppStore.selectedColumn.value = 'date';
      await quickExtractYear(callbacks);
      expectTransform('Extract Year', { derive: { date_year: 'year([date])' } });
    });

    it('quickExtractMonth', async () => {
      AppStore.selectedColumn.value = 'date';
      await quickExtractMonth(callbacks);
      expectTransform('Extract Month', { derive: { date_month: 'month([date])' } });
    });

    it('quickExtractDay', async () => {
      AppStore.selectedColumn.value = 'date';
      await quickExtractDay(callbacks);
      expectTransform('Extract Day', { derive: { date_day: 'day([date])' } });
    });

    it('quickExtractQuarter', async () => {
      AppStore.selectedColumn.value = 'date';
      await quickExtractQuarter(callbacks);
      expectTransform('Extract Quarter', { derive: { date_quarter: 'quarter([date])' } });
    });

    it('quickExtractWeekday', async () => {
      AppStore.selectedColumn.value = 'date';
      await quickExtractWeekday(callbacks);
      expectTransform('Extract Weekday', { derive: { date_weekday: 'weekday([date])' } });
    });

    it('quickExtractWeek', async () => {
      AppStore.selectedColumn.value = 'date';
      await quickExtractWeek(callbacks);
      expectTransform('Extract Week', { derive: { date_week: 'week([date])' } });
    });
  });

  // ============================================================
  // Date truncate shortcuts
  // ============================================================

  describe('date truncate shortcuts', () => {
    it('quickTruncYear', async () => {
      AppStore.selectedColumn.value = 'ts';
      await quickTruncYear(callbacks);
      expectTransform('Truncate to Year', {
        derive: { ts_year_trunc: 'date_trunc([ts], "year")' },
      });
    });

    it('quickTruncMonth', async () => {
      AppStore.selectedColumn.value = 'ts';
      await quickTruncMonth(callbacks);
      expectTransform('Truncate to Month', {
        derive: { ts_month_trunc: 'date_trunc([ts], "month")' },
      });
    });

    it('quickTruncWeek', async () => {
      AppStore.selectedColumn.value = 'ts';
      await quickTruncWeek(callbacks);
      expectTransform('Truncate to Week', {
        derive: { ts_week_trunc: 'date_trunc([ts], "week")' },
      });
    });

    it('quickTruncDay', async () => {
      AppStore.selectedColumn.value = 'ts';
      await quickTruncDay(callbacks);
      expectTransform('Truncate to Day', {
        derive: { ts_day_trunc: 'date_trunc([ts], "day")' },
      });
    });
  });

  // ============================================================
  // Number shortcuts
  // ============================================================

  describe('number shortcuts', () => {
    it('quickRound', async () => {
      AppStore.selectedColumn.value = 'price';
      await quickRound(callbacks);
      expectTransform('Round', { derive: { price: 'round([price])' } });
    });

    it('quickFloor', async () => {
      AppStore.selectedColumn.value = 'price';
      await quickFloor(callbacks);
      expectTransform('Floor', { derive: { price: 'floor([price])' } });
    });

    it('quickCeil', async () => {
      AppStore.selectedColumn.value = 'price';
      await quickCeil(callbacks);
      expectTransform('Ceiling', { derive: { price: 'ceil([price])' } });
    });

    it('quickTrunc', async () => {
      AppStore.selectedColumn.value = 'price';
      await quickTrunc(callbacks);
      expectTransform('Truncate Decimals', { derive: { price: 'trunc([price])' } });
    });

    it('quickAbs', async () => {
      AppStore.selectedColumn.value = 'balance';
      await quickAbs(callbacks);
      expectTransform('Absolute Value', { derive: { balance: 'abs([balance])' } });
    });

    it('quickSign creates _sign column', async () => {
      AppStore.selectedColumn.value = 'balance';
      await quickSign(callbacks);
      expectTransform('Sign', { derive: { balance_sign: 'sign([balance])' } });
    });
  });

  // ============================================================
  // Convert shortcuts
  // ============================================================

  describe('convert shortcuts', () => {
    it('quickConvertToString', async () => {
      AppStore.selectedColumn.value = 'age';
      await quickConvertToString(callbacks);
      expectTransform('Convert to Text', { types: { age: 'string' } });
    });

    it('quickConvertToNumber', async () => {
      AppStore.selectedColumn.value = 'amount';
      await quickConvertToNumber(callbacks);
      expectTransform('Convert to Number', { types: { amount: 'float' } });
    });

    it('quickConvertToInteger', async () => {
      AppStore.selectedColumn.value = 'count';
      await quickConvertToInteger(callbacks);
      expectTransform('Convert to Integer', { types: { count: 'integer' } });
    });

    it('quickConvertToDate', async () => {
      AppStore.selectedColumn.value = 'created';
      await quickConvertToDate(callbacks);
      expectTransform('Convert to Date', { types: { created: 'date' } });
    });

    it('clears selectedColumn after convert', async () => {
      AppStore.selectedColumn.value = 'age';
      await quickConvertToString(callbacks);
      expect(AppStore.selectedColumn.value).toBeNull();
    });

    it('does nothing when no column selected', async () => {
      await quickConvertToString(callbacks);
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });
  });
});
