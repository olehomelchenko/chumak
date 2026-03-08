import type { Signal } from '@preact/signals';
import styles from '../form-controls.module.css';
import joinStyles from '../JoinDialog.module.css';
import type { JoinType } from '../JoinDialog';

// Icon mapping for join types
const joinTypeIcons: Record<JoinType, string> = {
  inner: 'carbon:join-inner',
  left: 'carbon:join-left',
  right: 'carbon:join-right',
  full: 'carbon:join-full',
  cross: 'carbon:join',
  semi: 'carbon:dot-mark',
  anti: 'carbon:error-filled',
  lookup: 'carbon:search',
};

const joinTypeHelpText: Record<JoinType, string> = {
  inner: 'Keep only rows that match in both tables',
  left: 'Keep all rows from left table, matching rows from right',
  right: 'Keep all rows from right table, matching rows from left',
  full: 'Keep all rows from both tables',
  cross: 'Cartesian product (all combinations)',
  semi: 'Keep rows from left table that have matches in right',
  anti: 'Keep rows from left table that do NOT have matches in right',
  lookup: 'Left join optimized for looking up specific values',
};

const JOIN_TYPES: JoinType[] = [
  'inner',
  'left',
  'right',
  'full',
  'cross',
  'semi',
  'anti',
  'lookup',
];

interface JoinTypeSelectorProps {
  joinType: Signal<JoinType>;
  onChange: (type: JoinType) => void;
}

export function JoinTypeSelector({ joinType, onChange }: JoinTypeSelectorProps) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value as JoinType);
  };

  return (
    <div class={styles.group}>
      <label class={styles.label}>Join Type</label>
      <div class={joinStyles.joinTypeGrid}>
        {JOIN_TYPES.map((type) => (
          <label key={type} class={styles.radioLabel}>
            <input
              type="radio"
              name="joinType"
              value={type}
              checked={joinType.value === type}
              onChange={handleChange}
            />
            <span
              class="iconify"
              data-icon={joinTypeIcons[type]}
              style={{ fontSize: '16px' }}
            ></span>
            <span style={{ textTransform: 'capitalize' }}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </label>
        ))}
      </div>
      <div class={styles.helpText}>{joinTypeHelpText[joinType.value]}</div>
    </div>
  );
}
