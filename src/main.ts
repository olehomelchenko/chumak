import * as aq from 'arquero';
import Papa from 'papaparse';
import jsep from 'jsep';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import vegaEmbed from 'vega-embed';
import Alpine from 'alpinejs';

// Core Logic (Refactored to TS)
import { SchemaEngine } from './core/schema-engine';
import { parseExpression } from './core/expression-parser';
import { validateAST } from './core/ast-validator';
import { interpretAST } from './core/ast-interpreter';
import { applyTransform, describeTransform } from './core/transforms';
import * as UXSettings from './core/ux-settings';
import * as Storage from './core/storage';
import * as URLState from './core/url-state';
import { EDAEngine } from './core/eda-engine';
import { ChartsEngine } from './core/charts';
import { perfLogger } from './core/performance-logger';
import { TransformResult } from './core/transform-result';
import { formatError } from './core/error-formatter';

// CSS
import '../styles/index.css';

// Attach all to window for legacy compatibility
(window as any).aq = aq;
(window as any).Papa = Papa;
(window as any).jsep = jsep;
(window as any).vega = vega;
(window as any).vegaLite = vegaLite;
(window as any).vegaEmbed = vegaEmbed;
(window as any).Alpine = Alpine;

(window as any).SchemaEngine = SchemaEngine;
(window as any).parseExpression = parseExpression;
(window as any).validateAST = validateAST;
(window as any).interpretAST = interpretAST;
(window as any).applyTransform = applyTransform;
(window as any).describeTransform = describeTransform;

(window as any).loadUXSettings = UXSettings.loadUXSettings;
(window as any).saveUXSettings = UXSettings.saveUXSettings;
(window as any).updateUXSetting = UXSettings.updateUXSetting;
(window as any).resetUXSettings = UXSettings.resetUXSettings;

(window as any).loadInitialData = Storage.loadInitialData;
(window as any).saveSources = Storage.saveSources;
(window as any).saveModels = Storage.saveModels;
(window as any).autoSave = Storage.autoSave;
(window as any).clearAllData = Storage.clearAllData;

(window as any).getUrlState = URLState.getUrlState;
(window as any).setUrlState = URLState.setUrlState;

(window as any).EDAEngine = EDAEngine;
(window as any).ChartsEngine = ChartsEngine;
(window as any).perfLogger = perfLogger;
(window as any).TransformResult = TransformResult;
(window as any).formatError = formatError;

// Core bundled
import { ChumakApp } from './chumak-app';
import { mountComponent } from './app/components/PreactBridge';
import { RibbonToolbar } from './app/components/RibbonToolbar';
import { AppHeader } from './app/components/AppHeader';
import { Sidebar } from './app/components/Sidebar';
import { MainContent } from './app/components/MainContent';
import { TypeMenu } from './app/components/TypeMenu';

// Store global app reference for Ribbon callbacks
let appInstance: ChumakApp | null = null;

// Register Alpine component
Alpine.data('chumakApp', () => {
  appInstance = new ChumakApp();
  return appInstance;
});

// Start Alpine
Alpine.start();

// Mount Preact components after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const mountComponents = () => {
    if (!appInstance) {
      setTimeout(mountComponents, 50);
      return;
    }

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Mount Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      mountComponent(headerContainer, AppHeader, {
        onOpenDialog: (dialog: any) => appInstance?.openDialog(dialog),
        onClearAllData: () => appInstance?.clearAllData(),
      });
    }

    // Mount Ribbon
    const ribbonContainer = document.getElementById('ribbon-container');
    if (ribbonContainer) {
      mountComponent(ribbonContainer, RibbonToolbar, {
        onOpenDialog: (dialog: any) => appInstance?.openDialog(dialog),
        onAutoDetectSchema: () => appInstance?.autoDetectSchema(),
      });
    }

    // Mount Sidebar
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
      mountComponent(sidebarContainer, Sidebar, {
        onUploadClick: () => fileInput?.click(),
        onPasteClick: () => appInstance?.promptPaste(),
        onUrlClick: () => appInstance?.showImportUrlDialog(),
        onSwitchToSource: (source: any) => appInstance?.switchToSource(source),
        onSwitchToModel: (model: any) => appInstance?.switchToModel(model),
        onViewStep: (index: number) => appInstance?.viewStep(index),
        onEditStep: (index: number) => appInstance?.editStep(index),
        onRemoveStep: (index: number) => appInstance?.removeStep(index),
        onViewFinalResult: () => appInstance?.viewFinalResult(),
        onGetStepsJson: () => appInstance?.getStepsJson() || '[]',
        onEnterJsonEditMode: () => appInstance?.enterJsonEditMode(),
        onCancelJsonEdit: () => appInstance?.cancelJsonEdit(),
        onApplyJsonEdit: () => appInstance?.applyJsonChanges(),
        onValidateJsonEdit: () => {
          try {
            const content = appInstance?.jsonEditContent;
            if (content) {
              const parsed = JSON.parse(content);
              if (!Array.isArray(parsed.transforms)) {
                if (appInstance)
                  appInstance.jsonEditError = 'JSON must contain a "transforms" array';
              } else {
                if (appInstance) appInstance.jsonEditError = null;
              }
            }
          } catch (e: any) {
            if (appInstance) appInstance.jsonEditError = `Invalid JSON: ${e.message}`;
          }
        },
        getModelMeta: (model: any) => appInstance?.getModelMeta(model) || '',
      });
    }

    // Mount Main Content
    const mainContentContainer = document.getElementById('main-content-container');
    if (mainContentContainer) {
      mountComponent(mainContentContainer, MainContent, {
        // Empty state props
        onUploadClick: () => fileInput?.click(),
        onPasteClick: () => appInstance?.promptPaste(),
        onUrlClick: () => appInstance?.showImportUrlDialog(),
        onFileDrop: (e: any) => appInstance?.handleFileDrop(e),
        // Dataset info props
        onRenameSource: (source: any) => appInstance?.renameSource(source),
        onDeleteSource: (source: any) => appInstance?.deleteSource(source),
        onSwitchToModel: (model: any) => appInstance?.switchToModel(model),
        onCreateNewModel: (source: any) => appInstance?.createNewModel(source),
        // Pagination props
        onRenameModel: () => appInstance?.renameCurrentModel(),
        onCopyModel: () => appInstance?.copyCurrentModel(),
        onCreateNewModelFromActive: () => appInstance?.createNewModelFromActive(),
        onDeleteModel: () => appInstance?.deleteCurrentModel(),
        onOpenDialog: (dialog: any) => appInstance?.openDialog(dialog),
        onCopyCSV: () => appInstance?.copyCSVToClipboard(),
        onCopyJSON: () => appInstance?.copyJSONToClipboard(),
        onFirstPage: () => appInstance?.goToFirstPage(),
        onPrevPage: () => appInstance?.previousPage(),
        onNextPage: () => appInstance?.nextPage(),
        onLastPage: () => appInstance?.goToLastPage(),
        onPageSizeChange: (size: number) => appInstance?.updatePageSize(size),
        getPaginationInfo: () => appInstance?.getPaginationInfo() || '',
        // Data table props
        getPaginatedData: () => appInstance?.getPaginatedData() || [],
        getColumnType: (col: string) => appInstance?.getColumnType(col) || 'string',
        getTypeIcon: (col: string) =>
          appInstance?.getTypeIcon(col) || 'carbon:text-short-paragraph',
        getCellClass: (val: any, col: string) =>
          appInstance?.getCellClass(val, col) || 'data-table__cell',
        formatCellValue: (val: any) => appInstance?.formatCellValue(val) || String(val),
        onSelectColumn: (col: string) => appInstance?.selectColumn(col),
        onSelectCell: (col: string, val: any, idx: number) =>
          appInstance?.selectCell(col, val, idx),
        onOpenTypeMenu: (col: string, e: MouseEvent) => appInstance?.openTypeMenu(col, e),
        onClearColumnSelection: () => appInstance?.clearColumnSelection(),
        onScroll: () => appInstance?.updateToolbarPosition(),
      });
    }

    // Mount Type Menu
    const typeMenuContainer = document.getElementById('type-menu-container');
    if (typeMenuContainer) {
      mountComponent(typeMenuContainer, TypeMenu, {
        onChangeType: (col: string, type: string) => appInstance?.changeColumnType(col, type),
        onClose: () => {
          if (appInstance) appInstance.typeMenuOpen = false;
        },
      });
    }
  };

  mountComponents();
});

console.log('🚀 Chumak modern bundle initialized');
