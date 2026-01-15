import { useComputed } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';
import styles from './AppHeader.module.css';

type RibbonTabName = 'prepare' | 'calculate' | 'combine';

export interface AppHeaderProps {
  onOpenDialog: (dialog: DialogName) => void;
  onClearAllData: () => void;
}

export function AppHeader({ onOpenDialog, onClearAllData }: AppHeaderProps) {
  const ribbonTab = AppStore.ribbonTab;
  const hasData = useComputed(() => !!AppStore.currentData.value);

  const setTab = (tab: RibbonTabName) => {
    if (hasData.value) {
      ribbonTab.value = tab;
    }
  };

  const getTabClass = (tab: RibbonTabName) => {
    const classes = [styles.tab];
    if (ribbonTab.value === tab) classes.push(styles.active);
    if (!hasData.value) classes.push(styles.disabled);
    return classes.join(' ');
  };

  return (
    <header class={styles.header}>
      <div class={styles.content}>
        {/* Logo */}
        <div class={styles.logo}>
          <span class={styles.logoIcon}>☆</span>
          <span class={styles.logoText}>Chumak</span>
        </div>

        {/* Ribbon Tabs */}
        <div class={styles.tabs}>
          <button
            class={getTabClass('prepare')}
            disabled={!hasData.value}
            onClick={() => setTab('prepare')}
          >
            Prepare
          </button>
          <button
            class={getTabClass('calculate')}
            disabled={!hasData.value}
            onClick={() => setTab('calculate')}
          >
            Calculate
          </button>
          <button
            class={getTabClass('combine')}
            disabled={!hasData.value}
            onClick={() => setTab('combine')}
          >
            Combine
          </button>
        </div>

        {/* Action Buttons */}
        <div class={styles.actions}>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('about')}
            title="About Chumak"
          >
            <span class="iconify" data-icon="carbon:information"></span>
            <span>About</span>
          </button>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('settings')}
            title="Application Settings"
          >
            <span class="iconify" data-icon="carbon:settings"></span>
            <span>Settings</span>
          </button>
          <button
            class={`button button--secondary button--small ${styles.clearButton}`}
            onClick={onClearAllData}
            title="Clear all data from IndexedDB (for debugging)"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </header>
  );
}
