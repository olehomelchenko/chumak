import { useComputed } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';
import styles from './AppHeader.module.css';
import { useTranslation } from 'preact-i18next';

type RibbonTabName = 'rows' | 'columns' | 'table';

export interface AppHeaderProps {
  onOpenDialog: (dialog: DialogName) => void;
  onLogoClick: () => void;
}

export function AppHeader({ onOpenDialog, onLogoClick }: AppHeaderProps) {
  const { t } = useTranslation('common');
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
        <button class={styles.logo} onClick={onLogoClick}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Syto" class={styles.logoImage} />
          <span class={styles.logoText}>Syto</span>
        </button>

        {/* Ribbon Tabs */}
        <div class={styles.tabs} role="tablist" aria-label={t('aria.headerTabs')}>
          <button
            class={getTabClass('rows')}
            disabled={!hasData.value}
            onClick={() => setTab('rows')}
            role="tab"
            aria-selected={ribbonTab.value === 'rows'}
          >
            {t('header.tabs.rows')}
          </button>
          <button
            class={getTabClass('columns')}
            disabled={!hasData.value}
            onClick={() => setTab('columns')}
            role="tab"
            aria-selected={ribbonTab.value === 'columns'}
          >
            {t('header.tabs.columns')}
          </button>
          <button
            class={getTabClass('table')}
            disabled={!hasData.value}
            onClick={() => setTab('table')}
            role="tab"
            aria-selected={ribbonTab.value === 'table'}
          >
            {t('header.tabs.table')}
          </button>
        </div>

        {/* Action Buttons */}
        <div class={styles.actions}>
          <a
            class="button button--secondary button--small"
            href="/about/"
            title={t('tooltips.about')}
          >
            <span class="iconify" aria-hidden="true" data-icon="carbon:information"></span>
            <span>{t('buttons.about')}</span>
          </a>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('reference')}
            title={t('tooltips.help')}
          >
            <span class="iconify" aria-hidden="true" data-icon="carbon:help"></span>
            <span>{t('buttons.help')}</span>
          </button>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('dependency-graph')}
            title={t('tooltips.graph')}
          >
            <span class="iconify" aria-hidden="true" data-icon="carbon:network-3"></span>
            <span>{t('labels.graph')}</span>
          </button>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('settings')}
            title={t('tooltips.settings')}
          >
            <span class="iconify" aria-hidden="true" data-icon="carbon:settings"></span>
            <span>{t('buttons.settings')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
