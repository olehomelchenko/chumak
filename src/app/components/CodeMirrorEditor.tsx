import { useRef, useEffect } from 'preact/hooks';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';

export interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  diagnostics?: Diagnostic[];
  className?: string;
  onEditorReady?: (view: EditorView) => void;
}

/**
 * Reusable CodeMirror 6 wrapper for Preact.
 * Provides JSON syntax highlighting and linting support.
 */
export function CodeMirrorEditor({
  value,
  onChange,
  diagnostics,
  className,
  onEditorReady,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const diagnosticsRef = useRef<Diagnostic[]>([]);

  // Keep diagnostics ref in sync
  diagnosticsRef.current = diagnostics ?? [];

  // Initialize editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      basicSetup,
      json(),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      lintGutter(),
      linter(() => diagnosticsRef.current),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions,
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    onEditorReady?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g., reset)
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  // Force re-lint when diagnostics change
  useEffect(() => {
    const view = viewRef.current;
    if (view && diagnostics) {
      // Trigger a no-op transaction to force linter refresh
      view.dispatch({});
    }
  }, [diagnostics]);

  return <div ref={containerRef} class={className} />;
}
