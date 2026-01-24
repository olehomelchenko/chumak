import { useComputed } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';
import styles from './RibbonToolbar.module.css';

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
      class={`${styles.button} ${disabled ? styles.disabled : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      <span class="iconify" data-icon={icon} style="width: 32px; height: 32px;"></span>
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
    <div class={styles.group}>
      <div class={styles.groupLabel}>{label}</div>
      <div style={{ display: 'flex', gap: '4px' }}>{children}</div>
    </div>
  );
}

function RibbonDivider() {
  return <div class={styles.divider}></div>;
}

export interface RibbonToolbarProps {
  onOpenDialog: (dialog: DialogName) => void;
  onAutoDetectSchema: () => void;
}

export function RibbonToolbar({ onOpenDialog, onAutoDetectSchema }: RibbonToolbarProps) {
  const ribbonTab = AppStore.ribbonTab;
  const hasData = useComputed(() => !!AppStore.currentData.value);

  return (
    <div class={`${styles.ribbon} ${!hasData.value ? styles.disabled : ''}`}>
      <div class={styles.content}>
        {/* Prepare Tab */}
        {ribbonTab.value === 'prepare' && (
          <div class={styles.panel}>
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
                title="Select, rename, remove, reorder columns, and apply pattern operations"
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
            </RibbonGroup>
          </div>
        )}

        {/* Calculate Tab */}
        {ribbonTab.value === 'calculate' && (
          <div class={styles.panel}>
            {/* New Columns Group */}
            <RibbonGroup label="New Columns">
              <RibbonButton
                icon="carbon:add-alt"
                label="Derive"
                title="Create new column from expression"
                onClick={() => onOpenDialog('derive')}
              />
              <RibbonButton
                icon="carbon:flow"
                label="Conditional"
                title="Create column based on multiple conditions"
                onClick={() => onOpenDialog('conditional')}
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
            </RibbonGroup>

            <RibbonDivider />

            {/* Transform Values Group */}
            <RibbonGroup label="Transform Values">
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
              <RibbonButton
                icon="material-symbols-light:edit-arrow-down-outline-rounded"
                label="Impute"
                title="Fill missing values (null, undefined, NaN)"
                onClick={() => onOpenDialog('impute')}
              />
            </RibbonGroup>
          </div>
        )}

        {/* Combine Tab */}
        {ribbonTab.value === 'combine' && (
          <div class={styles.panel}>
            <RibbonGroup label="Combine Data">
              <RibbonButton
                icon="carbon:branch"
                label="Join"
                title="Join with another model or dataset"
                onClick={() => onOpenDialog('join')}
              />
              <RibbonButton
                icon="carbon:join-left"
                label="Concat"
                title="Stack rows from another model/source (keeps duplicates)"
                onClick={() => onOpenDialog('concat')}
              />
              <RibbonButton
                icon="carbon:join-inner"
                label="Union"
                title="Stack rows from another model/source (removes duplicates)"
                onClick={() => onOpenDialog('union')}
              />
            </RibbonGroup>
          </div>
        )}
      </div>
    </div>
  );
}
