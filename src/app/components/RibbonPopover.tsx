import { useRef, useEffect } from 'preact/hooks';
import styles from './RibbonPopover.module.css';

// ============================================================
// Sub-components
// ============================================================

interface ShortcutChipProps {
  label: string;
  title: string;
  onClick: () => void;
  disabled: boolean;
}

export function ShortcutChip({ label, title, onClick, disabled }: ShortcutChipProps) {
  return (
    <button class={styles.chip} title={title} disabled={disabled} onClick={onClick} role="menuitem">
      {label}
    </button>
  );
}

interface PopoverSectionProps {
  label: string;
  children: preact.ComponentChildren;
}

export function PopoverSection({ label, children }: PopoverSectionProps) {
  return (
    <div class={styles.section}>
      <div class={styles.sectionLabel}>{label}</div>
      <div class={styles.chipRow}>{children}</div>
    </div>
  );
}

export function PopoverDivider() {
  return <div class={styles.divider} />;
}

interface PopoverDialogLinkProps {
  icon: string;
  label: string;
  onClick: () => void;
}

export function PopoverDialogLink({ icon, label, onClick }: PopoverDialogLinkProps) {
  return (
    <button class={styles.dialogLink} onClick={onClick} role="menuitem">
      <span class="iconify" data-icon={icon} style="width: 14px; height: 14px;" />
      {label}
    </button>
  );
}

// ============================================================
// Main Popover
// ============================================================

export interface RibbonPopoverProps {
  anchorRect: DOMRect;
  onClose: () => void;
  children: preact.ComponentChildren;
}

export function RibbonPopover({ anchorRect, onClose, children }: RibbonPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position below the anchor button, aligned to its left edge
  const top = anchorRect.bottom + 4;
  let left = anchorRect.left;

  // Clamp to viewport (will be refined after render if needed)
  if (typeof window !== 'undefined') {
    const maxLeft = window.innerWidth - 360; // max-width of popover
    if (left > maxLeft) left = Math.max(0, maxLeft);
  }

  // Focus first enabled button when popover opens
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const firstBtn = el.querySelector<HTMLElement>('button[role="menuitem"]:not(:disabled)');
    if (firstBtn) firstBtn.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const el = popoverRef.current;
    if (!el) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    const items = Array.from(
      el.querySelectorAll<HTMLElement>('button[role="menuitem"]:not(:disabled)')
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        items[0].focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        break;
    }
  };

  return (
    <>
      <div class={styles.overlay} onClick={onClose} />
      <div
        ref={popoverRef}
        class={styles.popover}
        role="menu"
        onKeyDown={handleKeyDown}
        style={{ top: `${top}px`, left: `${left}px` }}
      >
        {children}
      </div>
    </>
  );
}
