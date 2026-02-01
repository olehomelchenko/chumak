import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { PatternMatchType } from '../../../../types/modes';

export const removePatternState = {
  pattern: signal(''),
  matchType: signal<PatternMatchType>('prefix'),
  error: signal<string | null>(null),
};

export function resetRemovePatternState() {
  removePatternState.pattern.value = '';
  removePatternState.matchType.value = 'prefix';
  removePatternState.error.value = null;
}

registerResetFunction(resetRemovePatternState);
