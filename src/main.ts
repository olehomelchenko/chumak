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
import '../styles/chumak.css';

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

// Import the main app component
import './chumak-app.js';

// Start Alpine
Alpine.start();

console.log('🚀 Chumak modern bundle initialized');
