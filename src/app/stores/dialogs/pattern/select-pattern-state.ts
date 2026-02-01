import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { PatternMatchType } from '../../../../types/modes';

export const selectPatternState = {
  pattern: signal(''),
  matchType: signal<PatternMatchType>('prefix'),
  include: signal<string[]>([]),
  error: signal<string | null>(null),
};

export function resetSelectPatternState() {
  selectPatternState.pattern.value = '';
  selectPatternState.matchType.value = 'prefix';
  selectPatternState.include.value = [];
  selectPatternState.error.value = null;
}

registerResetFunction(resetSelectPatternState);
