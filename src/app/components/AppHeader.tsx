// Note: 'h' import not needed - Vite's JSX transform handles it
import { useComputed } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';

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

  const tabClass = (tab: RibbonTabName) => {
    const classes = ['ribbon__tab'];
    if (ribbonTab.value === tab) classes.push('ribbon__tab--active');
    if (!hasData.value) classes.push('ribbon__tab--disabled');
    return classes.join(' ');
  };

  return (
    <div class="header__content">
      {/* Logo */}
      <div class="header__logo">
        <span class="header__logo-icon">☆</span>
        <span class="header__logo-text">Chumak</span>
      </div>

      {/* Ribbon Tabs */}
      <div class="ribbon__tabs" style={{ marginLeft: '2rem' }}>
        <button
          class={tabClass('prepare')}
          disabled={!hasData.value}
          onClick={() => setTab('prepare')}
        >
          Prepare
        </button>
        <button
          class={tabClass('calculate')}
          disabled={!hasData.value}
          onClick={() => setTab('calculate')}
        >
          Calculate
        </button>
        <button
          class={tabClass('combine')}
          disabled={!hasData.value}
          onClick={() => setTab('combine')}
        >
          Combine
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          class="button button--secondary button--small"
          onClick={onClearAllData}
          title="Clear all data from IndexedDB (for debugging)"
          style={{ background: '#d33e2c', color: 'white', borderColor: '#d33e2c' }}
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}
