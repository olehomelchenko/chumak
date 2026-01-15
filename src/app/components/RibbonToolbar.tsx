// Note: 'h' import not needed - Vite's JSX transform handles it
import { useComputed, useSignalEffect } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';
import { useRef } from 'preact/hooks';

interface RibbonButtonProps {
  icon: string;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

function RibbonButton({ icon, label, title, onClick, disabled }: RibbonButtonProps) {
  return (
    <button
      class={`ribbon__button${disabled ? ' ribbon__button--disabled' : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      <span class="iconify" data-icon={icon}></span>
      <span>{label}</span>
    </button>
  );
}

interface RibbonGroupProps {
  label: string;
  children: preact.ComponentChildren;
}

function RibbonGroup({ label, children }: RibbonGroupProps) {
  return (
    <div class="ribbon__group">
      <div class="ribbon__group-label">{label}</div>
      <div style={{ display: 'flex', gap: '4px' }}>{children}</div>
    </div>
  );
}

function RibbonDivider() {
  return <div class="ribbon__divider"></div>;
}

export interface RibbonToolbarProps {
  onOpenDialog: (dialog: DialogName) => void;
  onAutoDetectSchema: () => void;
}

export function RibbonToolbar({ onOpenDialog, onAutoDetectSchema }: RibbonToolbarProps) {
  const ribbonTab = AppStore.ribbonTab;
  const hasData = useComputed(() => !!AppStore.currentData.value);
  const contentRef = useRef<HTMLDivElement>(null);

  // Toggle ribbon--disabled on the container parent
  useSignalEffect(() => {
    const container = contentRef.current?.parentElement;
    if (container) {
      container.classList.toggle('ribbon--disabled', !hasData.value);
    }
  });

  return (
    <div class="ribbon__content" ref={contentRef}>
      {/* Prepare Tab */}
      {ribbonTab.value === 'prepare' && (
        <div class="ribbon__panel">
          {/* Clean Rows Group */}
          <RibbonGroup label="Clean Rows">
            <RibbonButton
              icon="carbon:filter"
              label="Filter"
              title="Filter rows"
              onClick={() => onOpenDialog('filter')}
            />
            <RibbonButton
              icon="carbon:arrows-vertical"
              label="Sort"
              title="Sort rows"
              onClick={() => onOpenDialog('sort')}
            />
            <RibbonButton
              icon="carbon:checkbox-checked"
              label="Duplicates"
              title="Handle duplicate rows"
              onClick={() => onOpenDialog('dedupe')}
            />
            <RibbonButton
              icon="carbon:result"
              label="Slice Rows"
              title="Keep or remove top/bottom N rows"
              onClick={() => onOpenDialog('sliceRows')}
            />
          </RibbonGroup>

          <RibbonDivider />

          {/* Manage Columns Group */}
          <RibbonGroup label="Manage Columns">
            <RibbonButton
              icon="carbon:table-split"
              label="Edit Columns"
              title="Select, rename, remove, and reorder columns"
              onClick={() => onOpenDialog('column-editor')}
            />
            <RibbonButton
              icon="carbon:split-screen"
              label="Split"
              title="Split column by delimiter"
              onClick={() => onOpenDialog('split')}
            />
          </RibbonGroup>

          <RibbonDivider />

          {/* Types & Format Group */}
          <RibbonGroup label="Types & Format">
            <RibbonButton
              icon="carbon:renew"
              label="Auto-Detect"
              title="Re-run type detection for all columns"
              onClick={onAutoDetectSchema}
            />
            <RibbonButton
              icon="carbon:text-align-left"
              label="Format"
              title="Format numbers, dates, text (Coming soon)"
              onClick={() => {}}
              disabled
            />
          </RibbonGroup>
        </div>
      )}

      {/* Calculate Tab */}
      {ribbonTab.value === 'calculate' && (
        <div class="ribbon__panel">
          {/* New Columns Group */}
          <RibbonGroup label="New Columns">
            <RibbonButton
              icon="carbon:add-alt"
              label="Derive"
              title="Create new column from expression"
              onClick={() => onOpenDialog('derive')}
            />
            <RibbonButton
              icon="carbon:text-link-analysis"
              label="Match"
              title="Create boolean column from regex match"
              onClick={() => onOpenDialog('regexpMatch')}
            />
            <RibbonButton
              icon="carbon:string-text"
              label="Extract"
              title="Extract text using regex pattern"
              onClick={() => onOpenDialog('regexpExtract')}
            />
            <RibbonButton
              icon="carbon:row-insert"
              label="Index"
              title="Add index/row number column"
              onClick={() => onOpenDialog('index')}
            />
            <RibbonButton
              icon="carbon:decision-tree"
              label="Conditional"
              title="Conditional column (IF/THEN) (Coming soon)"
              onClick={() => {}}
              disabled
            />
          </RibbonGroup>

          <RibbonDivider />

          {/* Summarize Group */}
          <RibbonGroup label="Summarize">
            <RibbonButton
              icon="carbon:layers"
              label="Group By"
              title="Group rows and calculate aggregates"
              onClick={() => onOpenDialog('aggregate')}
            />
          </RibbonGroup>

          <RibbonDivider />

          {/* Reshape Group */}
          <RibbonGroup label="Reshape">
            <RibbonButton
              icon="material-symbols-light:pivot-table-chart-rounded"
              label="Pivot"
              title="Pivot - create columns from values (long to wide)"
              onClick={() => onOpenDialog('pivot')}
            />
            <RibbonButton
              icon="material-symbols-light:table-convert-outline-rounded"
              label="Unpivot"
              title="Unpivot - convert columns to key-value pairs"
              onClick={() => onOpenDialog('fold')}
            />
            <RibbonButton
              icon="carbon:transpose"
              label="Transpose"
              title="Transpose rows and columns (Coming soon)"
              onClick={() => {}}
              disabled
            />
          </RibbonGroup>

          <RibbonDivider />

          {/* Transform Values Group */}
          <RibbonGroup label="Transform Values">
            <RibbonButton
              icon="carbon:text-bold"
              label="Text"
              title="Text operations: uppercase, lowercase, trim (Coming soon)"
              onClick={() => {}}
              disabled
            />
            <RibbonButton
              icon="carbon:calculator"
              label="Number"
              title="Number operations: round, absolute, math (Coming soon)"
              onClick={() => {}}
              disabled
            />
            <RibbonButton
              icon="carbon:calendar"
              label="Date"
              title="Date operations: extract parts, truncate to period"
              onClick={() => onOpenDialog('date')}
            />
            <RibbonButton
              icon="codicon:replace"
              label="Replace"
              title="Replace values in a column"
              onClick={() => onOpenDialog('replace')}
            />
          </RibbonGroup>
        </div>
      )}

      {/* Combine Tab */}
      {ribbonTab.value === 'combine' && (
        <div class="ribbon__panel">
          <RibbonGroup label="&nbsp;">
            <RibbonButton
              icon="carbon:branch"
              label="Join"
              title="Join with another model or dataset"
              onClick={() => onOpenDialog('join')}
            />
            <RibbonButton
              icon="carbon:arrow-down"
              label="Append"
              title="Append rows from another dataset (Coming soon)"
              onClick={() => {}}
              disabled
            />
            <RibbonButton
              icon="carbon:intersect"
              label="Union"
              title="Union - combine and deduplicate (Coming soon)"
              onClick={() => {}}
              disabled
            />
          </RibbonGroup>
        </div>
      )}
    </div>
  );
}
