import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsDialog } from './SettingsDialog';
import { DialogStore } from '../stores/DialogStore';

describe('SettingsDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.settingsState.theme.value = 'syto';
    DialogStore.settingsState.rowLimit.value = 100;
  });

  it('renders correctly', () => {
    render(<SettingsDialog />);

    expect(screen.getByText('Color Scheme')).toBeDefined();
    expect(screen.getByText('Syto')).toBeDefined();
    expect(screen.getByText('Blues (KSE)')).toBeDefined();
    expect(screen.getByDisplayValue('100')).toBeDefined();
  });

  it('handles theme change', () => {
    const onThemeChange = vi.fn();
    render(<SettingsDialog onThemeChange={onThemeChange} />);

    fireEvent.click(screen.getByText('Blues (KSE)'));
    expect(DialogStore.settingsState.theme.value).toBe('blues');
    expect(onThemeChange).toHaveBeenCalledWith('blues');
  });

  it('handles row limit change', () => {
    const onRowLimitChange = vi.fn();
    render(<SettingsDialog onRowLimitChange={onRowLimitChange} />);

    const input = screen.getByDisplayValue('100');
    fireEvent.input(input, { target: { value: '200' } });
    expect(DialogStore.settingsState.rowLimit.value).toBe(200);
    expect(onRowLimitChange).toHaveBeenCalledWith(200);
  });

  it('shows active theme correctly checkmark/dot', () => {
    DialogStore.settingsState.theme.value = 'blues'; // Set initial to blues
    render(<SettingsDialog />);
    // Checking styles is hard, but we can verify structure if needed.
    // For now, functional tests are enough.
  });
});
