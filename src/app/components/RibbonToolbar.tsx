import { useComputed } from '@preact/signals';
import { useRef } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { AppController } from '../orchestration/AppController';
import { getColumnType } from '../handlers/core/helper-handlers';
import {
  getShortcutsByCategory,
  type DeriveShortcutDef,
  type ConvertShortcutDef,
} from '../handlers/transform/shortcut-handlers';
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

function getNoColumnTitle(t: any, requiredType: string): string {
  const col = AppStore.selectedColumn.value;
  if (!col) return t(`ribbon.popovers.${requiredType}.noColumn`);
  return t(
    `ribbon.popovers.${requiredType}.requires${requiredType.charAt(0).toUpperCase() + requiredType.slice(1)}`
  );
}

// ============================================================
// Data-driven popover rendering
// ============================================================

function renderShortcutSections(
  category: string,
  disabled: boolean,
  noColTitle: string,
  onClose: () => void,
  t: any
) {
  const shortcuts = getShortcutsByCategory(category) as DeriveShortcutDef[];

  // Group by section, preserving array order
  const sections: { key: string; items: DeriveShortcutDef[] }[] = [];
  for (const s of shortcuts) {
    const last = sections[sections.length - 1];
    if (last && last.key === s.section) {
      last.items.push(s);
    } else {
      sections.push({ key: s.section, items: [s] });
    }
  }

  return sections.map(({ key, items }) => (
    <PopoverSection key={key} label={t(`ribbon.popovers.${category}.sections.${key}`)}>
      {items.map((s) => (
        <ShortcutChip
          key={s.id}
          label={t(`ribbon.popovers.${category}.shortcuts.${s.i18nKey}.label`)}
          title={
            disabled ? noColTitle : t(`ribbon.popovers.${category}.shortcuts.${s.i18nKey}.title`)
          }
          disabled={disabled}
          onClick={() => {
            onClose();
            AppController.executeShortcut(s.id);
          }}
        />
      ))}
    </PopoverSection>
  ));
}

// ============================================================
// Popover content renderers
// ============================================================

function TextPopoverContent({
  onOpenDialog,
  onClose,
  t,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
  t: any;
}) {
  const disabled = !isTextColumn(getSelectedColumnType());
  const noColTitle = getNoColumnTitle(t, 'text');

  return (
    <>
      {renderShortcutSections('text', disabled, noColTitle, onClose, t)}
      <PopoverDivider />
      <div class={popoverStyles.dialogLinks}>
        <PopoverDialogLink
          icon="carbon:split-screen"
          label={t('ribbon.popovers.text.links.split')}
          onClick={() => {
            onClose();
            onOpenDialog('split');
          }}
        />
        <PopoverDialogLink
          icon="codicon:replace"
          label={t('ribbon.popovers.text.links.replace')}
          onClick={() => {
            onClose();
            onOpenDialog('replace');
          }}
        />
        <PopoverDialogLink
          icon="carbon:string-text"
          label={t('ribbon.popovers.text.links.extractRegex')}
          onClick={() => {
            onClose();
            onOpenDialog('regexpExtract');
          }}
        />
        <PopoverDialogLink
          icon="carbon:string-text"
          label={t('ribbon.popovers.text.links.textOperations')}
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
  t,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
  t: any;
}) {
  const disabled = !isDateColumn(getSelectedColumnType());
  const noColTitle = getNoColumnTitle(t, 'date');

  return (
    <>
      {renderShortcutSections('date', disabled, noColTitle, onClose, t)}
      <PopoverDivider />
      <div class={popoverStyles.dialogLinks}>
        <PopoverDialogLink
          icon="carbon:calendar"
          label={t('ribbon.popovers.date.links.dateOperations')}
          onClick={() => {
            onClose();
            onOpenDialog('date');
          }}
        />
        <PopoverDialogLink
          icon="carbon:calendar-add"
          label={t('ribbon.popovers.date.links.parseDate')}
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
  t,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
  t: any;
}) {
  const disabled = !isNumericColumn(getSelectedColumnType());
  const noColTitle = getNoColumnTitle(t, 'number');

  return (
    <>
      {renderShortcutSections('number', disabled, noColTitle, onClose, t)}
      <PopoverDivider />
      <div class={popoverStyles.dialogLinks}>
        <PopoverDialogLink
          icon="carbon:add-alt"
          label={t('ribbon.popovers.number.links.deriveExpression')}
          onClick={() => {
            onClose();
            onOpenDialog('derive');
          }}
        />
      </div>
    </>
  );
}

function ConvertPopoverContent({ onClose, t }: { onClose: () => void; t: any }) {
  const type = getSelectedColumnType();
  const noCol = !AppStore.selectedColumn.value;
  const noColTitle = noCol ? t('ribbon.popovers.convert.noColumn') : '';
  const shortcuts = getShortcutsByCategory('convert') as ConvertShortcutDef[];

  return (
    <PopoverSection label={t('ribbon.popovers.convert.section')}>
      {shortcuts.map((s) => {
        const isAlready = !noCol && s.disabledWhenType.includes(type!);
        return (
          <ShortcutChip
            key={s.id}
            label={t(`ribbon.popovers.convert.shortcuts.${s.i18nKey}.label`)}
            title={
              noCol
                ? noColTitle
                : isAlready
                  ? t(`ribbon.popovers.convert.shortcuts.${s.i18nKey}.already`)
                  : t(`ribbon.popovers.convert.shortcuts.${s.i18nKey}.title`)
            }
            disabled={noCol || isAlready}
            onClick={() => {
              onClose();
              AppController.executeShortcut(s.id);
            }}
          />
        );
      })}
    </PopoverSection>
  );
}

// ============================================================
// More dropdown (overflow for niche operations)
// ============================================================

function MorePopoverContent({
  onOpenDialog,
  onClose,
  t,
}: {
  onOpenDialog: (d: DialogName) => void;
  onClose: () => void;
  t: any;
}) {
  return (
    <>
      <PopoverDialogLink
        icon="carbon:column"
        label={t('ribbon.popovers.more.spread')}
        onClick={() => {
          onClose();
          onOpenDialog('spread');
        }}
      />
      <PopoverDialogLink
        icon="carbon:row"
        label={t('ribbon.popovers.more.unroll')}
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
  const { t } = useTranslation('ui');
  const category = AppStore.ribbonPopover.value;
  const rect = AppStore.ribbonPopoverRect.value;
  if (!category || !rect) return null;

  const onClose = () => AppController.closeRibbonPopover();

  return (
    <RibbonPopover anchorRect={rect} onClose={onClose}>
      {category === 'text' && (
        <TextPopoverContent onOpenDialog={onOpenDialog} onClose={onClose} t={t} />
      )}
      {category === 'date' && (
        <DatePopoverContent onOpenDialog={onOpenDialog} onClose={onClose} t={t} />
      )}
      {category === 'number' && (
        <NumberPopoverContent onOpenDialog={onOpenDialog} onClose={onClose} t={t} />
      )}
      {category === 'convert' && <ConvertPopoverContent onClose={onClose} t={t} />}
      {category === 'more' && (
        <MorePopoverContent onOpenDialog={onOpenDialog} onClose={onClose} t={t} />
      )}
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
  const { t } = useTranslation('ui');
  const ribbonTab = AppStore.ribbonTab;
  const hasData = useComputed(() => !!AppStore.currentData.value);

  return (
    <div
      class={`${styles.ribbon} ${!hasData.value ? styles.disabled : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div class={styles.content}>
        {/* Rows Tab */}
        {ribbonTab.value === 'rows' && (
          <div class={styles.panel}>
            <RibbonGroup label={t('ribbon.groups.filterSort')}>
              <RibbonButton
                icon="carbon:filter"
                label={t('ribbon.buttons.filter.label')}
                title={t('ribbon.buttons.filter.title')}
                onClick={() => onOpenDialog('filter')}
              />
              <RibbonButton
                icon="carbon:arrows-vertical"
                label={t('ribbon.buttons.sort.label')}
                title={t('ribbon.buttons.sort.title')}
                onClick={() => onOpenDialog('sort')}
              />
              <RibbonButton
                icon="carbon:checkbox-checked"
                label={t('ribbon.buttons.duplicates.label')}
                title={t('ribbon.buttons.duplicates.title')}
                onClick={() => onOpenDialog('dedupe')}
              />
              <RibbonButton
                icon="carbon:result"
                label={t('ribbon.buttons.sliceRows.label')}
                title={t('ribbon.buttons.sliceRows.title')}
                onClick={() => onOpenDialog('sliceRows')}
              />
              <RibbonButton
                icon="carbon:chart-venn-diagram"
                label={t('ribbon.buttons.sample.label')}
                title={t('ribbon.buttons.sample.title')}
                onClick={() => onOpenDialog('sample')}
              />
              <RibbonButton
                icon="carbon:table-of-contents"
                label={t('ribbon.buttons.promoteHeader.label')}
                title={t('ribbon.buttons.promoteHeader.title')}
                onClick={() => onOpenDialog('promoteHeader')}
              />
            </RibbonGroup>
          </div>
        )}

        {/* Columns Tab */}
        {ribbonTab.value === 'columns' && (
          <div class={styles.panel}>
            {/* Manage Group */}
            <RibbonGroup label={t('ribbon.groups.manage')}>
              <RibbonButton
                icon="carbon:table-split"
                label={t('ribbon.buttons.editColumns.label')}
                title={t('ribbon.buttons.editColumns.title')}
                onClick={() => onOpenDialog('column-editor')}
              />
              <RibbonButton
                icon="carbon:split-screen"
                label={t('ribbon.buttons.split.label')}
                title={t('ribbon.buttons.split.title')}
                onClick={() => onOpenDialog('split')}
              />
              <RibbonButton
                icon="carbon:join-left"
                label={t('ribbon.buttons.merge.label')}
                title={t('ribbon.buttons.merge.title')}
                onClick={() => onOpenDialog('merge')}
              />
              <RibbonDropdownButton
                icon="carbon:overflow-menu-horizontal"
                label={t('ribbon.buttons.more')}
                category="more"
              />
            </RibbonGroup>

            <RibbonDivider />

            {/* New Columns Group */}
            <RibbonGroup label={t('ribbon.groups.newColumns')}>
              <RibbonButton
                icon="carbon:add-alt"
                label={t('ribbon.buttons.derive.label')}
                title={t('ribbon.buttons.derive.title')}
                onClick={() => onOpenDialog('derive')}
              />
              <RibbonButton
                icon="carbon:flow"
                label={t('ribbon.buttons.conditional.label')}
                title={t('ribbon.buttons.conditional.title')}
                onClick={() => onOpenDialog('conditional')}
              />
              <RibbonButton
                icon="carbon:text-link-analysis"
                label={t('ribbon.buttons.match.label')}
                title={t('ribbon.buttons.match.title')}
                onClick={() => onOpenDialog('regexpMatch')}
              />
              <RibbonButton
                icon="carbon:string-text"
                label={t('ribbon.buttons.extract.label')}
                title={t('ribbon.buttons.extract.title')}
                onClick={() => onOpenDialog('regexpExtract')}
              />
              <RibbonButton
                icon="carbon:row-insert"
                label={t('ribbon.buttons.index.label')}
                title={t('ribbon.buttons.index.title')}
                onClick={() => onOpenDialog('index')}
              />
            </RibbonGroup>

            <RibbonDivider />

            {/* Transform Values Group */}
            <RibbonGroup label={t('ribbon.groups.transformValues')}>
              <RibbonDropdownButton
                icon="carbon:string-text"
                label={t('ribbon.buttons.text')}
                category="text"
              />
              <RibbonDropdownButton
                icon="carbon:calendar"
                label={t('ribbon.buttons.date')}
                category="date"
              />
              <RibbonDropdownButton
                icon="carbon:character-whole-number"
                label={t('ribbon.buttons.number')}
                category="number"
              />
              <RibbonDropdownButton
                icon="carbon:data-format"
                label={t('ribbon.buttons.convert')}
                category="convert"
              />
              <RibbonButton
                icon="codicon:replace"
                label={t('ribbon.buttons.replace.label')}
                title={t('ribbon.buttons.replace.title')}
                onClick={() => onOpenDialog('replace')}
              />
              <RibbonButton
                icon="material-symbols-light:edit-arrow-down-outline-rounded"
                label={t('ribbon.buttons.impute.label')}
                title={t('ribbon.buttons.impute.title')}
                onClick={() => onOpenDialog('impute')}
              />
            </RibbonGroup>

            <RibbonDivider />

            {/* Types Group */}
            <RibbonGroup label={t('ribbon.groups.types')}>
              <RibbonButton
                icon="carbon:renew"
                label={t('ribbon.buttons.autoDetect.label')}
                title={t('ribbon.buttons.autoDetect.title')}
                onClick={onAutoDetectSchema}
              />
            </RibbonGroup>
          </div>
        )}

        {/* Table Tab */}
        {ribbonTab.value === 'table' && (
          <div class={styles.panel}>
            {/* Summarize Group */}
            <RibbonGroup label={t('ribbon.groups.summarize')}>
              <RibbonButton
                icon="carbon:layers"
                label={t('ribbon.buttons.groupBy.label')}
                title={t('ribbon.buttons.groupBy.title')}
                onClick={() => onOpenDialog('aggregate')}
              />
              <RibbonButton
                icon="carbon:chart-stepper"
                label={t('ribbon.buttons.window.label')}
                title={t('ribbon.buttons.window.title')}
                onClick={() => onOpenDialog('window')}
              />
              <RibbonButton
                icon="carbon:data-table"
                label={t('ribbon.buttons.describe.label')}
                title={t('ribbon.buttons.describe.title')}
                onClick={() => onOpenDialog('describe')}
              />
            </RibbonGroup>

            <RibbonDivider />

            {/* Reshape Group */}
            <RibbonGroup label={t('ribbon.groups.reshape')}>
              <RibbonButton
                icon="material-symbols-light:pivot-table-chart-rounded"
                label={t('ribbon.buttons.pivot.label')}
                title={t('ribbon.buttons.pivot.title')}
                onClick={() => onOpenDialog('pivot')}
              />
              <RibbonButton
                icon="material-symbols-light:table-convert-outline-rounded"
                label={t('ribbon.buttons.unpivot.label')}
                title={t('ribbon.buttons.unpivot.title')}
                onClick={() => onOpenDialog('fold')}
              />
            </RibbonGroup>

            <RibbonDivider />

            {/* Combine Group */}
            <RibbonGroup label={t('ribbon.groups.combine')}>
              <RibbonButton
                icon="carbon:branch"
                label={t('ribbon.buttons.join.label')}
                title={t('ribbon.buttons.join.title')}
                onClick={() => onOpenDialog('join')}
              />
              <RibbonButton
                icon="carbon:join-full"
                label={t('ribbon.buttons.append.label')}
                title={t('ribbon.buttons.append.title')}
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
