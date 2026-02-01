import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { Theme } from '../../../../types/modes';

export const settingsState = {
  theme: signal<Theme>('syto'),
  rowLimit: signal(100),
  analyticsOptOut: signal(false),
};

export function resetSettingsState() {
  settingsState.theme.value = 'syto';
  settingsState.rowLimit.value = 100;
  // Note: analyticsOptOut is not reset as it's a user preference
}

registerResetFunction(resetSettingsState);
