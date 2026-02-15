/**
 * useFocusTrap Hook Tests
 *
 * Tests focus trapping, Tab wrapping, and focus restoration behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/preact';
import { useFocusTrap } from './useFocusTrap';

/** Test harness that uses the hook with a controllable active signal */
function TrapHarness({ active }: { active: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return (
    <div>
      <button data-testid="outside">Outside</button>
      {active && (
        <div ref={ref} data-testid="trap">
          <button data-testid="first">First</button>
          <input data-testid="middle" />
          <button data-testid="last">Last</button>
        </div>
      )}
    </div>
  );
}

function pressTab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.activeElement?.dispatchEvent(event);
  return event;
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    // Reset focus to body
    (document.activeElement as HTMLElement)?.blur?.();
  });

  it('should auto-focus the first focusable element when active', () => {
    render(<TrapHarness active={true} />);

    const first = document.querySelector('[data-testid="first"]') as HTMLElement;
    expect(document.activeElement).toBe(first);
  });

  it('should not trap focus when inactive', () => {
    render(<TrapHarness active={false} />);

    // The trap container should not be rendered
    const trap = document.querySelector('[data-testid="trap"]');
    expect(trap).toBeNull();
  });

  it('should wrap focus from last to first on Tab', () => {
    render(<TrapHarness active={true} />);

    const first = document.querySelector('[data-testid="first"]') as HTMLElement;
    const last = document.querySelector('[data-testid="last"]') as HTMLElement;

    // Focus the last element
    last.focus();
    expect(document.activeElement).toBe(last);

    // Press Tab — should wrap to first
    const event = pressTab();
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('should wrap focus from first to last on Shift+Tab', () => {
    render(<TrapHarness active={true} />);

    const first = document.querySelector('[data-testid="first"]') as HTMLElement;
    const last = document.querySelector('[data-testid="last"]') as HTMLElement;

    // Focus is already on first from auto-focus
    expect(document.activeElement).toBe(first);

    // Press Shift+Tab — should wrap to last
    const event = pressTab(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('should not prevent Tab when focus is in the middle', () => {
    render(<TrapHarness active={true} />);

    const middle = document.querySelector('[data-testid="middle"]') as HTMLElement;

    // Focus the middle element
    middle.focus();
    expect(document.activeElement).toBe(middle);

    // Press Tab — should NOT be prevented (browser handles it)
    const event = pressTab();
    expect(event.defaultPrevented).toBe(false);
  });

  it('should restore focus on unmount', () => {
    // Focus a button outside the trap first
    const outerButton = document.createElement('button');
    outerButton.textContent = 'Return target';
    document.body.appendChild(outerButton);
    outerButton.focus();
    expect(document.activeElement).toBe(outerButton);

    // Render with trap active, then unmount
    const { unmount } = render(<TrapHarness active={true} />);

    // Focus should have moved into the trap
    const first = document.querySelector('[data-testid="first"]') as HTMLElement;
    expect(document.activeElement).toBe(first);

    // Unmount triggers cleanup — focus should restore to the outer button
    unmount();
    expect(document.activeElement).toBe(outerButton);

    // Cleanup
    document.body.removeChild(outerButton);
  });
});
