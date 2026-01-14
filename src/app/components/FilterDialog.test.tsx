/**
 * FilterDialog Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { FilterDialog, FilterPreviewMode } from './FilterDialog';

describe('FilterDialog', () => {
  it('renders with default values', () => {
    const expression = signal('');
    const error = signal<string | null>(null);
    const previewMode = signal<FilterPreviewMode>('all');
    const onOpenReference = vi.fn();

    render(
      <FilterDialog
        expression={expression}
        error={error}
        previewMode={previewMode}
        onOpenReference={onOpenReference}
      />
    );

    expect(screen.getByPlaceholderText('e.g., sales > 1000')).toBeDefined();
    expect(screen.getByText('Show All').className).toContain('button--primary');
  });

  it('updates expression when typed', () => {
    const expression = signal('');
    const error = signal<string | null>(null);
    const previewMode = signal<FilterPreviewMode>('all');
    const onOpenReference = vi.fn();

    render(
      <FilterDialog
        expression={expression}
        error={error}
        previewMode={previewMode}
        onOpenReference={onOpenReference}
      />
    );

    const input = screen.getByPlaceholderText('e.g., sales > 1000') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'price > 10' } });

    expect(expression.value).toBe('price > 10');
  });

  it('toggles preview mode', () => {
    const expression = signal('');
    const error = signal<string | null>(null);
    const previewMode = signal<FilterPreviewMode>('all');
    const onOpenReference = vi.fn();

    render(
      <FilterDialog
        expression={expression}
        error={error}
        previewMode={previewMode}
        onOpenReference={onOpenReference}
      />
    );

    fireEvent.click(screen.getByText('Matching Only'));
    expect(previewMode.value).toBe('matching');
  });

  it('shows error message when present', () => {
    const expression = signal('invalid');
    const error = signal<string | null>('Syntax error');
    const previewMode = signal<FilterPreviewMode>('all');
    const onOpenReference = vi.fn();

    render(
      <FilterDialog
        expression={expression}
        error={error}
        previewMode={previewMode}
        onOpenReference={onOpenReference}
      />
    );

    expect(screen.getByText('Syntax error')).toBeDefined();
  });

  it('calls onOpenReference when clicked', () => {
    const expression = signal('');
    const error = signal<string | null>(null);
    const previewMode = signal<FilterPreviewMode>('all');
    const onOpenReference = vi.fn();

    render(
      <FilterDialog
        expression={expression}
        error={error}
        previewMode={previewMode}
        onOpenReference={onOpenReference}
      />
    );

    fireEvent.click(screen.getByText('Full Reference'));
    expect(onOpenReference).toHaveBeenCalled();
  });
});
