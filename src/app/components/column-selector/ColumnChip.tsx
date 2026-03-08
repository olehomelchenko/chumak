/**
 * ColumnChip - A chip button component for displaying and selecting columns
 */

import styles from '../form-controls.module.css';

export interface ColumnChipProps {
  label: string;
  icon: string; // iconify icon name
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  showCheckmark?: boolean; // for multi-select mode
}

export function ColumnChip({
  label,
  icon,
  isActive,
  onClick,
  disabled = false,
  showCheckmark = false,
}: ColumnChipProps) {
  return (
    <button
      type="button"
      class={`${styles.chip} ${isActive ? styles.active : ''}`}
      style={{
        flexDirection: 'row',
        justifyContent: 'start',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
      }}
      onClick={onClick}
      disabled={disabled}
    >
      <span class={`iconify ${styles.chipIcon}`} data-icon={icon} />
      {showCheckmark && isActive && (
        <span
          class={`iconify ${styles.chipIcon}`}
          data-icon="carbon:checkmark-filled"
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            fontSize: '0.875rem',
            color: 'var(--color-green)',
          }}
        />
      )}
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'left',
          flexGrow: 1,
        }}
      >
        {label}
      </span>
    </button>
  );
}
