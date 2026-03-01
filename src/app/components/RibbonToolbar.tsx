import { useComputed } from '@preact/signals';
import { useRef } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { AppController } from '../orchestration/AppController';
import { getColumnType } from '../handlers/core/helper-handlers';
import { DialogName } from '../types';
import {
  RibbonPopover,
  PopoverSection,
  PopoverDivider,
  PopoverDialogLink,
  ShortcutChip,
} from './RibbonPopover';
import styles from './RibbonToolbar.module.css';
import popoverStyles from './RibbonPopover.module.css';

// ============================================================
// Sub-components
// ============================================================

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

interface RibbonDropdownButtonProps {
  icon: string;
  label: string;
  category: string;
  disabled?: boolean;
}

function RibbonDropdownButton({ icon, label, category, disabled }: RibbonDropdownButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const isOpen = AppStore.ribbonPopover.value === category;

  const handleClick = () => {
    if (isOpen) {
      AppController.closeRibbonPopover();
    } else {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        AppController.openRibbonPopover(category, rect);
      }
    }
  };

  return (
    <button
      ref={btnRef}
      class={`${styles.dropdownButton} ${isOpen ? styles.dropdownOpen : ''} ${disabled ? styles.disabled : ''}`}
      onClick={handleClick}
      title={label}
      disabled={disabled}
    >
      <span class="iconify" data-icon={icon} style="width: 20px; height: 20px;"></span>
      <span>{label}</span>
      <span
        class="iconify"
        data-icon="carbon:chevron-down"
        style="width: 12px; height: 12px;"
      ></span>
    </button>
  );
}

// ============================================================
// Disabled state logic
// ============================================================

function getSelectedColumnType(): string | null {
  const col = AppStore.selectedColumn.value;
  if (!col) return null;
  return getColumnType(col);
}

function isTextColumn(type: string | null): boolean {
  return type === 'string';
}

function isDateColumn(type: string | null): boolean {
  return type === 'date' || type === 'datetime';
}

function isNumericColumn(type: string | null): boolean {
  return type === 'integer' || type === 'float';
}

function getNoColumnTitle(requiredType: string): string {
  const col = AppStore.selectedColumn.value;
  if (!col) return 'Select a column first';
  return `Requires a ${requiredType} column`;
}

// ============================================================
// Popover content renderers
// ============================================================

function TextPopoverContent({
  onOpenDialog,
  onClose,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
}) {
  const type = getSelectedColumnType();
  const disabled = !isTextColumn(type);
  const noColTitle = getNoColumnTitle('text');

  const applyAndClose = (action: () => Promise<void>) => {
    onClose();
    action();
  };

  return (
    <>
      <PopoverSection label="Case">
        <ShortcutChip
          label="UPPER"
          title={disabled ? noColTitle : 'Convert to uppercase'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickUpper())}
        />
        <ShortcutChip
          label="lower"
          title={disabled ? noColTitle : 'Convert to lowercase'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickLower())}
        />
        <ShortcutChip
          label="Title"
          title={disabled ? noColTitle : 'Capitalize first letter of each word'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTitlecase())}
        />
      </PopoverSection>
      <PopoverSection label="Clean">
        <ShortcutChip
          label="Trim"
          title={disabled ? noColTitle : 'Remove leading/trailing whitespace'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTrim())}
        />
      </PopoverSection>
      <PopoverSection label="Info">
        <ShortcutChip
          label="Len"
          title={disabled ? noColTitle : 'Get string length (creates new column)'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickLen())}
        />
      </PopoverSection>
      <PopoverDivider />
      <div class={popoverStyles.dialogLinks}>
        <PopoverDialogLink
          icon="carbon:split-screen"
          label="Split..."
          onClick={() => {
            onClose();
            onOpenDialog('split');
          }}
        />
        <PopoverDialogLink
          icon="codicon:replace"
          label="Replace..."
          onClick={() => {
            onClose();
            onOpenDialog('replace');
          }}
        />
        <PopoverDialogLink
          icon="carbon:string-text"
          label="Extract (regex)..."
          onClick={() => {
            onClose();
            onOpenDialog('regexpExtract');
          }}
        />
        <PopoverDialogLink
          icon="carbon:string-text"
          label="Text Operations..."
          onClick={() => {
            onClose();
            onOpenDialog('text');
          }}
        />
      </div>
    </>
  );
}

function DatePopoverContent({
  onOpenDialog,
  onClose,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
}) {
  const type = getSelectedColumnType();
  const disabled = !isDateColumn(type);
  const noColTitle = getNoColumnTitle('date');

  const applyAndClose = (action: () => Promise<void>) => {
    onClose();
    action();
  };

  return (
    <>
      <PopoverSection label="Extract Part">
        <ShortcutChip
          label="Year"
          title={disabled ? noColTitle : 'Extract year'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickExtractYear())}
        />
        <ShortcutChip
          label="Month"
          title={disabled ? noColTitle : 'Extract month (1-12)'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickExtractMonth())}
        />
        <ShortcutChip
          label="Day"
          title={disabled ? noColTitle : 'Extract day of month'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickExtractDay())}
        />
        <ShortcutChip
          label="Quarter"
          title={disabled ? noColTitle : 'Extract quarter (1-4)'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickExtractQuarter())}
        />
        <ShortcutChip
          label="Weekday"
          title={disabled ? noColTitle : 'Extract day of week (0=Mon, 6=Sun)'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickExtractWeekday())}
        />
        <ShortcutChip
          label="Week"
          title={disabled ? noColTitle : 'Extract ISO week number'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickExtractWeek())}
        />
      </PopoverSection>
      <PopoverSection label="Truncate To">
        <ShortcutChip
          label="→Year"
          title={disabled ? noColTitle : 'Truncate to start of year'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTruncYear())}
        />
        <ShortcutChip
          label="→Month"
          title={disabled ? noColTitle : 'Truncate to start of month'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTruncMonth())}
        />
        <ShortcutChip
          label="→Week"
          title={disabled ? noColTitle : 'Truncate to start of week'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTruncWeek())}
        />
        <ShortcutChip
          label="→Day"
          title={disabled ? noColTitle : 'Truncate to start of day'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTruncDay())}
        />
      </PopoverSection>
      <PopoverDivider />
      <div class={popoverStyles.dialogLinks}>
        <PopoverDialogLink
          icon="carbon:calendar"
          label="Date Operations..."
          onClick={() => {
            onClose();
            onOpenDialog('date');
          }}
        />
        <PopoverDialogLink
          icon="carbon:calendar-add"
          label="Parse Date..."
          onClick={() => {
            onClose();
            onOpenDialog('parseDate');
          }}
        />
      </div>
    </>
  );
}

function NumberPopoverContent({
  onOpenDialog,
  onClose,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
}) {
  const type = getSelectedColumnType();
  const disabled = !isNumericColumn(type);
  const noColTitle = getNoColumnTitle('numeric');

  const applyAndClose = (action: () => Promise<void>) => {
    onClose();
    action();
  };

  return (
    <>
      <PopoverSection label="Rounding">
        <ShortcutChip
          label="Round"
          title={disabled ? noColTitle : 'Round to nearest integer'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickRound())}
        />
        <ShortcutChip
          label="Floor"
          title={disabled ? noColTitle : 'Round down'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickFloor())}
        />
        <ShortcutChip
          label="Ceil"
          title={disabled ? noColTitle : 'Round up'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickCeil())}
        />
        <ShortcutChip
          label="Trunc"
          title={disabled ? noColTitle : 'Remove decimal portion'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickTruncNum())}
        />
      </PopoverSection>
      <PopoverSection label="Other">
        <ShortcutChip
          label="Abs"
          title={disabled ? noColTitle : 'Absolute value'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickAbs())}
        />
        <ShortcutChip
          label="Sign"
          title={disabled ? noColTitle : 'Sign (-1, 0, or 1) — creates new column'}
          disabled={disabled}
          onClick={() => applyAndClose(() => AppController.quickSign())}
        />
      </PopoverSection>
      <PopoverDivider />
      <div class={popoverStyles.dialogLinks}>
        <PopoverDialogLink
          icon="carbon:add-alt"
          label="Derive Expression..."
          onClick={() => {
            onClose();
            onOpenDialog('derive');
          }}
        />
      </div>
    </>
  );
}

function ConvertPopoverContent({ onClose }: { onClose: () => void }) {
  const type = getSelectedColumnType();
  const noCol = !AppStore.selectedColumn.value;
  const noColTitle = noCol ? 'Select a column first' : '';

  const applyAndClose = (action: () => Promise<void>) => {
    onClose();
    action();
  };

  return (
    <PopoverSection label="Convert To">
      <ShortcutChip
        label="→ Text"
        title={
          noCol ? noColTitle : type === 'string' ? 'Column is already text' : 'Convert to text'
        }
        disabled={noCol || type === 'string'}
        onClick={() => applyAndClose(() => AppController.quickConvertToString())}
      />
      <ShortcutChip
        label="→ Number"
        title={
          noCol
            ? noColTitle
            : type === 'float'
              ? 'Column is already a number'
              : 'Convert to number (float)'
        }
        disabled={noCol || type === 'float'}
        onClick={() => applyAndClose(() => AppController.quickConvertToNumber())}
      />
      <ShortcutChip
        label="→ Integer"
        title={
          noCol
            ? noColTitle
            : type === 'integer'
              ? 'Column is already integer'
              : 'Convert to integer'
        }
        disabled={noCol || type === 'integer'}
        onClick={() => applyAndClose(() => AppController.quickConvertToInteger())}
      />
      <ShortcutChip
        label="→ Date"
        title={
          noCol
            ? noColTitle
            : type === 'date' || type === 'datetime'
              ? 'Column is already a date'
              : 'Convert to date'
        }
        disabled={noCol || type === 'date' || type === 'datetime'}
        onClick={() => applyAndClose(() => AppController.quickConvertToDate())}
      />
    </PopoverSection>
  );
}

// ============================================================
// More dropdown (overflow for niche operations)
// ============================================================

function MorePopoverContent({
  onOpenDialog,
  onClose,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
}) {
  return (
    <>
      <PopoverDialogLink
        icon="carbon:column"
        label="Spread (arrays → columns)"
        onClick={() => {
          onClose();
          onOpenDialog('spread');
        }}
      />
      <PopoverDialogLink
        icon="carbon:row"
        label="Unroll (arrays → rows)"
        onClick={() => {
          onClose();
          onOpenDialog('unroll');
        }}
      />
    </>
  );
}

// ============================================================
// Popover renderer
// ============================================================

function ActivePopover({ onOpenDialog }: { onOpenDialog: (d: DialogName) => void }) {
  const category = AppStore.ribbonPopover.value;
  const rect = AppStore.ribbonPopoverRect.value;
  if (!category || !rect) return null;

  const onClose = () => AppController.closeRibbonPopover();

  return (
    <RibbonPopover anchorRect={rect} onClose={onClose}>
      {category === 'text' && <TextPopoverContent onOpenDialog={onOpenDialog} onClose={onClose} />}
      {category === 'date' && <DatePopoverContent onOpenDialog={onOpenDialog} onClose={onClose} />}
      {category === 'number' && (
        <NumberPopoverContent onOpenDialog={onOpenDialog} onClose={onClose} />
      )}
      {category === 'convert' && <ConvertPopoverContent onClose={onClose} />}
      {category === 'more' && <MorePopoverContent onOpenDialog={onOpenDialog} onClose={onClose} />}
    </RibbonPopover>
  );
}

// ============================================================
// Main Component
// ============================================================

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
        {/* Rows Tab */}
        {ribbonTab.value === 'rows' && (
          <div class={styles.panel}>
            <RibbonGroup label="Filter & Sort">
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
              <RibbonButton
                icon="carbon:chart-venn-diagram"
                label="Sample"
                title="Randomly sample rows (with optional seed)"
                onClick={() => onOpenDialog('sample')}
              />
            </RibbonGroup>
          </div>
        )}

        {/* Columns Tab */}
        {ribbonTab.value === 'columns' && (
          <div class={styles.panel}>
            {/* Manage Group */}
            <RibbonGroup label="Manage">
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
              <RibbonButton
                icon="carbon:join-left"
                label="Merge"
                title="Merge/concatenate multiple columns into one"
                onClick={() => onOpenDialog('merge')}
              />
              <RibbonDropdownButton
                icon="carbon:overflow-menu-horizontal"
                label="More"
                category="more"
              />
            </RibbonGroup>

            <RibbonDivider />

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

            {/* Transform Values Group */}
            <RibbonGroup label="Transform Values">
              <RibbonDropdownButton icon="carbon:string-text" label="Text" category="text" />
              <RibbonDropdownButton icon="carbon:calendar" label="Date" category="date" />
              <RibbonDropdownButton
                icon="carbon:character-whole-number"
                label="Number"
                category="number"
              />
              <RibbonDropdownButton icon="carbon:data-format" label="Convert" category="convert" />
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

            <RibbonDivider />

            {/* Types Group */}
            <RibbonGroup label="Types">
              <RibbonButton
                icon="carbon:renew"
                label="Auto-Detect"
                title="Re-run type detection for all columns"
                onClick={onAutoDetectSchema}
              />
            </RibbonGroup>
          </div>
        )}

        {/* Table Tab */}
        {ribbonTab.value === 'table' && (
          <div class={styles.panel}>
            {/* Summarize Group */}
            <RibbonGroup label="Summarize">
              <RibbonButton
                icon="carbon:layers"
                label="Group By"
                title="Group rows and calculate aggregates"
                onClick={() => onOpenDialog('aggregate')}
              />
              <RibbonButton
                icon="carbon:chart-stepper"
                label="Window"
                title="Window functions (lag, lead, rank, row_number)"
                onClick={() => onOpenDialog('window')}
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

            {/* Combine Group */}
            <RibbonGroup label="Combine">
              <RibbonButton
                icon="carbon:branch"
                label="Join"
                title="Join with another model or dataset"
                onClick={() => onOpenDialog('join')}
              />
              <RibbonButton
                icon="carbon:join-full"
                label="Append"
                title="Stack rows from another model/source (Concat or Union)"
                onClick={() => onOpenDialog('append')}
              />
            </RibbonGroup>
          </div>
        )}
      </div>

      {/* Render active popover (floats outside the ribbon) */}
      <ActivePopover onOpenDialog={onOpenDialog} />
    </div>
  );
}
