import { useTranslation } from 'preact-i18next';
import { AppStore } from '../../stores/AppStore';
import { positionEdaToolbar } from '../../handlers/core/interaction-handlers';
import styles from '../EdaPanel.module.css';

interface EdaOverviewProps {
  edaStats: {
    totalCount: number;
    nullCount: number;
    nullPercentage: number;
    uniqueCount: number;
    uniquePercentage: number;
    errorCount: number;
    errorPercentage: number;
  };
}

export function EdaOverview({ edaStats }: EdaOverviewProps) {
  const { t } = useTranslation('ui');
  const selectedColumn = AppStore.selectedColumn.value;

  const openToolbar = (type: 'missing' | 'errors', e: MouseEvent) => {
    e.stopPropagation();
    if (!selectedColumn) return;

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const toolbarPos = positionEdaToolbar(rect, 120);

    // Null-then-set via setTimeout forces toolbar to remount (resets position/animation).
    // Without this, Signals batches the update and the toolbar doesn't reposition.
    AppStore.selectedCell.value = null;
    setTimeout(() => {
      AppStore.selectedCell.value = {
        col: selectedColumn,
        value: null,
        type: 'string',
        isEda: true,
        edaLabel: type === 'missing' ? t('eda.overview.missing') : t('eda.overview.errors'),
        isEdaMissing: type === 'missing',
        isError: type === 'errors',
      };
      AppStore.cellToolbarPos.value = toolbarPos;
    }, 0);
  };

  return (
    <div class={styles.edaOverview}>
      <div class={styles.edaSection__title}>{t('eda.overview.title')}</div>
      <div class={styles.edaStatsList}>
        <div class={styles.edaStat}>
          <div class={styles.edaStat__label}>{t('eda.overview.totalRows')}</div>
          <div class={styles.edaStat__value}>{edaStats.totalCount?.toLocaleString()}</div>
        </div>
        <div
          class={`${styles.edaStat} ${edaStats.nullCount > 0 ? styles['edaStat--clickable'] : ''}`}
          title={t('eda.overview.missingTooltip', { percent: edaStats.nullPercentage })}
          onClick={edaStats.nullCount > 0 ? (e) => openToolbar('missing', e) : undefined}
        >
          {edaStats.nullCount > 0 && (
            <span class={styles.edaStat__actionHint}>
              <span class="iconify" aria-hidden="true" data-icon="carbon:filter" />
            </span>
          )}
          <div class={styles.edaStat__label}>{t('eda.overview.missing')}</div>
          <div class={styles.edaStat__value}>{edaStats.nullCount?.toLocaleString()}</div>
          <div
            class={styles.edaStat__sub}
            style={{ color: edaStats.nullCount > 0 ? 'var(--color-red)' : 'inherit' }}
          >
            {edaStats.nullPercentage}%
          </div>
        </div>
        <div class={styles.edaStat}>
          <div class={styles.edaStat__label}>{t('eda.overview.uniqueValues')}</div>
          <div class={styles.edaStat__value}>{edaStats.uniqueCount?.toLocaleString()}</div>
          <div class={styles.edaStat__sub}>{edaStats.uniquePercentage}%</div>
        </div>
        <div
          class={`${styles.edaStat} ${edaStats.errorCount > 0 ? styles['edaStat--clickable'] : ''}`}
          title={t('eda.overview.errorsTooltip', { percent: edaStats.errorPercentage })}
          onClick={edaStats.errorCount > 0 ? (e) => openToolbar('errors', e) : undefined}
        >
          {edaStats.errorCount > 0 && (
            <span class={styles.edaStat__actionHint}>
              <span class="iconify" aria-hidden="true" data-icon="carbon:filter" />
            </span>
          )}
          <div class={styles.edaStat__label}>{t('eda.overview.errors')}</div>
          <div class={styles.edaStat__value}>{edaStats.errorCount?.toLocaleString()}</div>
          <div
            class={styles.edaStat__sub}
            style={{ color: edaStats.errorCount > 0 ? 'var(--color-red)' : 'inherit' }}
          >
            {edaStats.errorPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
}
