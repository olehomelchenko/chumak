// Note: 'h' import not needed - Vite's JSX transform handles it
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';

export interface EmptyStateProps {
  onUploadClick: () => void;
  onUrlClick: () => void;
  onEnterDataClick: () => void;
  onFileDrop: (e: DragEvent) => void;
}

export function EmptyState({
  onUploadClick,
  onUrlClick,
  onEnterDataClick,
  onFileDrop,
}: EmptyStateProps) {
  const { t } = useTranslation('ui');
  const isDragging = AppStore.isDragging;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = true;
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;
    onFileDrop(e);
  };

  return (
    <div
      class={`empty-state${isDragging.value ? ' empty-state--dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div class="empty-state__content">
        <div class="empty-state__video-placeholder">
          <span class="iconify empty-state__video-icon" data-icon="carbon:play-filled"></span>
          <span class="empty-state__video-text">{t('emptyState.videoPlaceholder')}</span>
        </div>
        <span class="iconify empty-state__icon" data-icon="carbon:cloud-upload"></span>
        <h2 class="empty-state__title">{t('emptyState.title')}</h2>
        <p class="empty-state__text">{t('emptyState.subtitle')}</p>
        <div class="empty-state__actions">
          <button class="button button--primary" onClick={onUploadClick}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:upload"></span>
            {t('emptyState.uploadButton')}
          </button>
          <button class="button button--primary" onClick={onUrlClick}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:link"></span>
            {t('emptyState.urlButton')}
          </button>
          <button class="button button--primary" onClick={onEnterDataClick}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:text-long-paragraph"></span>
            {t('emptyState.enterButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
