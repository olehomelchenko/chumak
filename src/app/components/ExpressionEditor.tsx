/**
 * ExpressionEditor - CodeMirror 6 based single-line expression input
 * with syntax highlighting for the Syto expression language.
 */

import { useRef, useEffect, useMemo } from 'preact/hooks';
import { EditorView, keymap, ViewUpdate, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { minimalSetup } from 'codemirror';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';
import {
  createExpressionLanguage,
  createExpressionCompletion,
} from '../../core/expression-language';

export interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  columns: string[];
  className?: string;
}

/** Syntax highlight colors using project CSS variables */
const highlightStyle = HighlightStyle.define([
  { tag: tags.string, color: '#a31515' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.keyword, color: '#0000ff' },
  { tag: tags.operatorKeyword, fontWeight: 'bold', color: '#af00db' },
  { tag: tags.function(tags.definition(tags.variableName)), fontWeight: 'bold', color: '#795e26' },
  { tag: tags.variableName, color: '#001080' },
  { tag: tags.special(tags.variableName), color: '#001080' },
  { tag: tags.operator, color: '#d4351c' },
  { tag: tags.punctuation, color: '#666666' },
]);

/** Theme: compact single-line input with border, focus ring, and autocomplete styling */
const editorTheme = EditorView.theme({
  // Wrapper — matches .input class from TransformDialog.module.css
  '&': {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--color-white)',
    border: 'var(--border-width) solid var(--border-color)',
    borderRadius: 'var(--border-radius)',
    transition: 'border-color var(--transition-fast)',
    boxSizing: 'border-box',
    fontSize: 'var(--font-size-base)',
    fontFamily: 'var(--font-family-mono)',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--color-cyan)',
    boxShadow: '0 0 0 3px rgba(var(--color-cyan-rgb), 0.1)',
  },
  // Content — single-line, no wrapping
  '.cm-scroller': { overflow: 'hidden', lineHeight: '1.4' },
  '.cm-content': { padding: '0', whiteSpace: 'nowrap' },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'var(--color-midnight-blue)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'rgba(var(--color-cyan-rgb), 0.2) !important',
  },
  '.cm-placeholder': {
    color: 'var(--color-medium-gray)',
    fontFamily: 'var(--font-family)',
    fontStyle: 'italic',
  },
  // Autocomplete dropdown
  '.cm-tooltip.cm-tooltip-autocomplete': {
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
    border: 'var(--border-width) solid var(--border-color)',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-md)',
    background: 'var(--color-white)',
  },
  '.cm-tooltip-autocomplete ul li': { padding: '4px 8px', lineHeight: '1.4' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: 'rgba(var(--color-cyan-rgb), 0.12)',
    color: 'var(--color-midnight-blue)',
  },
  '.cm-completionLabel': {
    fontFamily: 'var(--font-family-mono)',
    fontSize: 'var(--font-size-sm)',
  },
  '.cm-completionDetail': {
    fontStyle: 'normal',
    color: 'var(--color-dark-gray)',
    marginLeft: '8px',
    fontSize: 'var(--font-size-xs)',
  },
  '.cm-completionInfo': {
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-xs)',
    padding: '8px',
    color: 'var(--color-dark-gray)',
  },
});

export function ExpressionEditor({
  value,
  onChange,
  placeholder,
  columns,
  className,
}: ExpressionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const completionCompartment = useRef(new Compartment());

  // Build column set from prop
  const columnSet = useMemo(() => new Set(columns), [columns]);

  // Initialize editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      minimalSetup,
      editorTheme,
      syntaxHighlighting(highlightStyle),
      langCompartment.current.of(createExpressionLanguage(columnSet)),
      closeBrackets(),
      completionCompartment.current.of(
        autocompletion({
          override: [createExpressionCompletion(columns)],
          activateOnTyping: true,
          icons: false,
        })
      ),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      // Prevent newline on Enter
      keymap.of([
        {
          key: 'Enter',
          run: () => true, // consume the event
        },
      ]),
      // Collapse multi-line paste to single line
      EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) return tr;
        let hasNewline = false;
        tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
          if (inserted.toString().includes('\n')) hasNewline = true;
        });
        if (!hasNewline) return tr;
        const changes: { from: number; to: number; insert: string }[] = [];
        tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          changes.push({ from: fromA, to: toA, insert: inserted.toString().replace(/\n/g, ' ') });
        });
        return { changes };
      }),
    ];

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder));
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions,
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  // Reconfigure language and completions when columns change
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: [
          langCompartment.current.reconfigure(createExpressionLanguage(columnSet)),
          completionCompartment.current.reconfigure(
            autocompletion({
              override: [createExpressionCompletion(columns)],
              activateOnTyping: true,
              icons: false,
            })
          ),
        ],
      });
    }
  }, [columnSet]); // columnSet is derived from columns, so this covers both

  return <div ref={containerRef} class={className} />;
}
