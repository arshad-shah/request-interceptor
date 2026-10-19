import { useEffect, useRef } from 'react';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers as lineNumbersExt,
  highlightActiveLine,
  highlightActiveLineGutter,
  placeholder as placeholderExt,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { codeTheme } from './theme';
import { languageExtensions, type CodeLanguage } from './languages';

export interface CodeMirrorOptions {
  value: string;
  onChange?: (value: string) => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
  language: CodeLanguage;
  readOnly: boolean;
  lineNumbers: boolean;
  wrap: boolean;
  placeholder?: string;
  ariaLabel?: string;
  /** Extra key bindings, e.g. format/copy shortcuts. */
  keys?: { key: string; run: () => boolean }[];
}

/**
 * Mount a CodeMirror 6 view into the returned ref. The view is created once;
 * option changes are applied through compartments, and external `value`
 * changes replace the document without losing undo history of local edits.
 */
export function useCodeMirror(options: CodeMirrorOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latest = useRef(options);
  latest.current = options;

  const compartments = useRef({
    language: new Compartment(),
    readOnly: new Compartment(),
    gutter: new Compartment(),
    wrap: new Compartment(),
    placeholder: new Compartment(),
    keys: new Compartment(),
  }).current;

  const gutterFor = (show: boolean, editable: boolean): Extension =>
    show ? [lineNumbersExt(), foldGutter(), editable ? highlightActiveLineGutter() : []] : [];
  const readOnlyFor = (readOnly: boolean): Extension => [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    readOnly ? [] : highlightActiveLine(),
  ];
  const keysFor = (keys: CodeMirrorOptions['keys']): Extension =>
    keymap.of((keys ?? []).map(({ key, run }) => ({ key, run, preventDefault: true })));

  useEffect(() => {
    if (!containerRef.current) return;
    const o = latest.current;
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: o.value,
        extensions: [
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          search({ top: true }),
          highlightSelectionMatches(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...lintKeymap,
            indentWithTab,
          ]),
          codeTheme,
          compartments.language.of(languageExtensions(o.language, !o.readOnly)),
          compartments.readOnly.of(readOnlyFor(o.readOnly)),
          compartments.gutter.of(gutterFor(o.lineNumbers, !o.readOnly)),
          compartments.wrap.of(o.wrap ? EditorView.lineWrapping : []),
          compartments.placeholder.of(o.placeholder ? placeholderExt(o.placeholder) : []),
          compartments.keys.of(keysFor(o.keys)),
          EditorView.contentAttributes.of(o.ariaLabel ? { 'aria-label': o.ariaLabel } : {}),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange?.(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) {
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              latest.current.onCursorChange?.({ line: line.number, column: head - line.from + 1 });
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Created once; later option changes go through compartments below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (e.g. format, reset, selecting another item)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== options.value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: options.value } });
    }
  }, [options.value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: [
        compartments.language.reconfigure(languageExtensions(options.language, !options.readOnly)),
        compartments.readOnly.reconfigure(readOnlyFor(options.readOnly)),
        compartments.gutter.reconfigure(gutterFor(options.lineNumbers, !options.readOnly)),
        compartments.wrap.reconfigure(options.wrap ? EditorView.lineWrapping : []),
        compartments.placeholder.reconfigure(options.placeholder ? placeholderExt(options.placeholder) : []),
        compartments.keys.reconfigure(keysFor(options.keys)),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.language, options.readOnly, options.lineNumbers, options.wrap, options.placeholder, options.keys]);

  return containerRef;
}
