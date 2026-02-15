import { useRef, useEffect } from 'preact/hooks';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within a container element.
 * When active: saves the previously focused element and focuses the first focusable child.
 * On Tab/Shift+Tab: wraps focus within the container.
 * When deactivated: restores focus to the previously focused element.
 *
 * @param active - Whether the focus trap is currently active
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = useRef<T>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    // Save current focus target for restoration
    returnFocusRef.current = document.activeElement;

    // Auto-focus the first focusable element
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (firstFocusable) {
      firstFocusable.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusableEls = container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the trap
      const returnTarget = returnFocusRef.current;
      if (returnTarget && returnTarget instanceof HTMLElement) {
        returnTarget.focus();
      }
    };
  }, [active]);

  return containerRef;
}
