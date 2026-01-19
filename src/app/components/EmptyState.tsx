// Note: 'h' import not needed - Vite's JSX transform handles it
import { AppStore } from '../stores/AppStore';

export interface EmptyStateProps {
  onUploadClick: () => void;
  onPasteClick: () => void;
  onUrlClick: () => void;
  onFileDrop: (e: DragEvent) => void;
}

export function EmptyState({
  onUploadClick,
  onPasteClick,
  onUrlClick,
  onFileDrop,
}: EmptyStateProps) {
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
        <span class="iconify empty-state__icon" data-icon="carbon:cloud-upload"></span>
        <h2 class="empty-state__title">Get Started with Syto</h2>
        <p class="empty-state__text">
          Drag and drop a CSV file here, or use one of the options below
        </p>
        <div class="empty-state__actions">
          <button class="button button--primary" onClick={onUploadClick}>
            <span class="iconify" data-icon="carbon:upload"></span>
            Upload CSV
          </button>
          <button class="button button--primary" onClick={onPasteClick}>
            <span class="iconify" data-icon="carbon:paste"></span>
            Paste Data
          </button>
          <button class="button button--primary" onClick={onUrlClick}>
            <span class="iconify" data-icon="carbon:link"></span>
            Import from URL
          </button>
          <button class="button button--secondary" disabled title="Coming soon">
            <span class="iconify" data-icon="carbon:data-table"></span>
            Load Example
          </button>
        </div>
      </div>
    </div>
  );
}
