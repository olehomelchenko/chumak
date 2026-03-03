import { useTranslation } from 'preact-i18next';
import type { ColumnType } from '../../core/schema-engine';
import styles from './TypeIndicator.module.css';

export interface TypeIndicatorProps {
  type: ColumnType;
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Displays a type indicator with icon/symbol and optional label.
 * Follows the same visual pattern as TypeMenu for consistency.
 */
export function TypeIndicator({ type, showLabel = true, size = 'medium' }: TypeIndicatorProps) {
  const { t } = useTranslation('ui');

  const getTypeDisplay = (type: ColumnType) => {
    switch (type) {
      case 'string':
        return { symbol: 'Aa', label: t('typeMenu.types.string'), icon: null };
      case 'integer':
        return { symbol: '#', label: t('typeMenu.types.integer'), icon: null };
      case 'float':
        return { symbol: '0.0', label: t('typeMenu.types.float'), icon: null };
      case 'boolean':
        return { symbol: '✓', label: t('typeMenu.types.boolean'), icon: null };
      case 'date':
        return { symbol: null, label: t('typeMenu.types.date'), icon: 'carbon:calendar' };
      case 'datetime':
        return { symbol: null, label: t('typeMenu.types.datetime'), icon: 'ix:calendar' };
      case 'json':
        return { symbol: '{}', label: t('typeMenu.types.json'), icon: null };
      default:
        return { symbol: 'Aa', label: t('typeMenu.types.string'), icon: null };
    }
  };

  const display = getTypeDisplay(type);
  const sizeClass = size === 'small' ? styles.small : styles.medium;

  return (
    <span class={`${styles.typeIndicator} ${sizeClass}`}>
      <span class={`${styles.indicator} ${styles[type]}`}>
        {display.icon ? <span class="iconify" data-icon={display.icon}></span> : display.symbol}
      </span>
      {showLabel && <span class={styles.label}>{display.label}</span>}
    </span>
  );
}
