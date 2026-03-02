import { useComputed } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';
import styles from './AppHeader.module.css';
import { useTranslation } from 'preact-i18next';

type RibbonTabName = 'rows' | 'columns' | 'table';

export interface AppHeaderProps {
  onOpenDialog: (dialog: DialogName) => void;
}

export function AppHeader({ onOpenDialog }: AppHeaderProps) {
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
        <div class={styles.logo}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Syto" class={styles.logoImage} />
          <span class={styles.logoText}>Syto</span>
        </div>

        {/* Ribbon Tabs */}
        <div class={styles.tabs}>
          <button
            class={getTabClass('rows')}
            disabled={!hasData.value}
            onClick={() => setTab('rows')}
          >
            Rows
          </button>
          <button
            class={getTabClass('columns')}
            disabled={!hasData.value}
            onClick={() => setTab('columns')}
          >
            Columns
          </button>
          <button
            class={getTabClass('table')}
            disabled={!hasData.value}
            onClick={() => setTab('table')}
          >
            Table
          </button>
        </div>

        {/* Action Buttons */}
        <div class={styles.actions}>
          <a
            class="button button--secondary button--small"
            href="/about/"
            title={t('tooltips.about')}
          >
            <span class="iconify" data-icon="carbon:information"></span>
            <span>{t('buttons.about')}</span>
          </a>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('reference')}
            title={t('tooltips.help')}
          >
            <span class="iconify" data-icon="carbon:help"></span>
            <span>{t('buttons.help')}</span>
          </button>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('dependency-graph')}
            title={t('tooltips.graph')}
          >
            <span class="iconify" data-icon="carbon:network-3"></span>
            <span>Graph</span>
          </button>
          <button
            class="button button--secondary button--small"
            onClick={() => onOpenDialog('settings')}
            title={t('tooltips.settings')}
          >
            <span class="iconify" data-icon="carbon:settings"></span>
            <span>{t('buttons.settings')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
