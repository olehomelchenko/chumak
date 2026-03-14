/**
 * InlineBanner - Shared component for info/warning/error/success banners within dialogs
 */

import { ComponentChildren } from 'preact';
import styles from './InlineBanner.module.css';

export interface InlineBannerProps {
  variant: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
  title?: string;
  children?: ComponentChildren;
  className?: string;
}

export function InlineBanner({ variant, icon, title, children, className }: InlineBannerProps) {
  return (
    <div class={`${styles.banner} ${styles[variant]} ${className || ''}`}>
      {icon && <span class={`iconify ${styles.icon}`} aria-hidden="true" data-icon={icon} />}
      <div class={styles.content}>
        {title && <div class={styles.title}>{title}</div>}
        {children}
      </div>
    </div>
  );
}
