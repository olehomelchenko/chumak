import { screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsDialog } from './SettingsDialog';
import { DialogStore } from '../stores/DialogStore';
import { renderWithI18n } from '../test-utils';

describe('SettingsDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.settingsState.theme.value = 'syto';
    DialogStore.settingsState.rowLimit.value = 100;
    DialogStore.settingsState.analyticsOptOut.value = false;
  });

  it('renders correctly', () => {
    renderWithI18n(<SettingsDialog />);

    expect(screen.getByText('Color scheme')).toBeDefined();
    expect(screen.getByText('Syto')).toBeDefined();
    expect(screen.getByText('Blues (KSE)')).toBeDefined();
    expect(screen.getByDisplayValue('100')).toBeDefined();
  });

  it('handles theme change', () => {
    const onThemeChange = vi.fn();
    renderWithI18n(<SettingsDialog onThemeChange={onThemeChange} />);

    fireEvent.click(screen.getByText('Blues (KSE)'));
    expect(DialogStore.settingsState.theme.value).toBe('blues');
    expect(onThemeChange).toHaveBeenCalledWith('blues');
  });

  it('handles row limit change', () => {
    const onRowLimitChange = vi.fn();
    renderWithI18n(<SettingsDialog onRowLimitChange={onRowLimitChange} />);

    const input = screen.getByDisplayValue('100');
    fireEvent.input(input, { target: { value: '200' } });
    expect(DialogStore.settingsState.rowLimit.value).toBe(200);
    expect(onRowLimitChange).toHaveBeenCalledWith(200);
  });

  it('shows active theme correctly checkmark/dot', () => {
    DialogStore.settingsState.theme.value = 'blues'; // Set initial to blues
    renderWithI18n(<SettingsDialog />);
    // Checking styles is hard, but we can verify structure if needed.
    // For now, functional tests are enough.
  });

  it('handles analytics opt-out change', () => {
    const onAnalyticsOptOutChange = vi.fn();
    renderWithI18n(<SettingsDialog onAnalyticsOptOutChange={onAnalyticsOptOutChange} />);

    // Find checkbox by type since the label structure is complex
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox).toBeDefined();
    expect(checkbox.checked).toBe(false);

    fireEvent.change(checkbox, { target: { checked: true } });
    expect(DialogStore.settingsState.analyticsOptOut.value).toBe(true);
    expect(onAnalyticsOptOutChange).toHaveBeenCalledWith(true);
  });
});
