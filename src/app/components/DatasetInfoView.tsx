// Note: 'h' import not needed - Vite's JSX transform handles it
import { AppStore } from '../stores/AppStore';
import type { Source, Model } from '../types';

export interface DatasetInfoViewProps {
  onRenameSource: (source: Source) => void;
  onDeleteSource: (source: Source) => void;
  onSwitchToModel: (model: Model) => void;
  onCreateNewModel: (source: Source) => void;
}

export function DatasetInfoView({
  onRenameSource,
  onDeleteSource,
  onSwitchToModel,
  onCreateNewModel,
}: DatasetInfoViewProps) {
  const activeSource = AppStore.activeSource;
  const models = AppStore.models;

  const source = activeSource.value;
  if (!source) return null;

  const sourceModels = models.value.filter((m) => m.sourceId === source.id);

  return (
    <div class="dataset-info">
      <div class="dataset-info__header">
        <div>
          <h1 class="dataset-info__title">{source.name}</h1>
          <p class="dataset-info__subtitle">Dataset Source</p>
        </div>
        <div class="dataset-info__actions">
          <button class="button button--secondary" onClick={() => onRenameSource(source)}>
            <span
              class="iconify"
              data-icon="carbon:edit"
              style={{ width: '24px', height: '24px' }}
            ></span>
            Rename
          </button>
          <button class="button button--danger" onClick={() => onDeleteSource(source)}>
            <span
              class="iconify"
              data-icon="carbon:trash-can"
              style={{ width: '24px', height: '24px' }}
            ></span>
            Delete
          </button>
        </div>
      </div>

      <div class="dataset-info__content">
        {/* Metadata Card */}
        <div class="info-card">
          <h3 class="info-card__title">Dataset Information</h3>
          <dl class="info-list">
            <div class="info-list__item">
              <dt class="info-list__label">Source Name</dt>
              <dd class="info-list__value">{source.name}</dd>
            </div>
            <div class="info-list__item">
              <dt class="info-list__label">Original File</dt>
              <dd class="info-list__value">{source.fileName}</dd>
            </div>
            <div class="info-list__item">
              <dt class="info-list__label">Rows</dt>
              <dd class="info-list__value">{source.rowCount?.toLocaleString()}</dd>
            </div>
            <div class="info-list__item">
              <dt class="info-list__label">Columns</dt>
              <dd class="info-list__value">{source.columns?.length}</dd>
            </div>
            <div class="info-list__item">
              <dt class="info-list__label">File Size</dt>
              <dd class="info-list__value">{`${((source.rawSize || 0) / 1024).toFixed(1)} KB`}</dd>
            </div>
            <div class="info-list__item">
              <dt class="info-list__label">Imported</dt>
              <dd class="info-list__value">
                {source.createdAt ? new Date(source.createdAt).toLocaleString() : 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Models List Card */}
        <div class="info-card">
          <h3 class="info-card__title">
            Models
            <span class="badge">{sourceModels.length}</span>
          </h3>
          <div class="models-list">
            {sourceModels.map((model) => (
              <div
                key={model.id}
                class="model-card"
                onClick={() => onSwitchToModel(model)}
                style={{ cursor: 'pointer' }}
              >
                <div class="model-card__icon">📊</div>
                <div class="model-card__content">
                  <div class="model-card__name">{model.name}</div>
                  <div class="model-card__meta">
                    <span>{`${(model.steps?.length || 1) - 1} step${(model.steps?.length || 1) - 1 !== 1 ? 's' : ''}`}</span>
                    <span>•</span>
                    <span>{`${model.data?.length?.toLocaleString() || 0} rows`}</span>
                  </div>
                </div>
                <div class="model-card__arrow">→</div>
              </div>
            ))}

            {/* New Model button */}
            <button
              class="button button--secondary"
              onClick={() => onCreateNewModel(source)}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              ➕ New Model
            </button>
          </div>
        </div>

        {/* Column Schema Card */}
        <div class="info-card info-card--full">
          <h3 class="info-card__title">Column Schema</h3>
          <table class="schema-table">
            <thead>
              <tr>
                <th class="schema-table__header">Column Name</th>
                <th class="schema-table__header">Type</th>
                <th class="schema-table__header">Position</th>
              </tr>
            </thead>
            <tbody>
              {(source.columns || []).map((column: any) => (
                <tr key={column.name} class="schema-table__row">
                  <td class="schema-table__cell">{column.name}</td>
                  <td class="schema-table__cell">
                    <span class={`type-badge type-badge--${column.type || column.inferredType}`}>
                      {column.type || column.inferredType}
                    </span>
                  </td>
                  <td class="schema-table__cell">{column.originalPosition + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
