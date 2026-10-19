import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/** Editor chrome driven by the app's design tokens, so it follows the UI theme. */
const editorTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-surface)',
      fontSize: 'var(--code-font-size, 12px)',
    },
    '.cm-scroller': {
      fontFamily: '"SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      lineHeight: '1.55',
    },
    '.cm-content': { caretColor: 'var(--accent-blue)', padding: '6px 0' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent-blue)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(99, 102, 241, 0.28)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-tertiary)',
      border: 'none',
      borderRight: '1px solid var(--border-subtle)',
    },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
    '.cm-placeholder': { color: 'var(--text-tertiary)' },
    '.cm-tooltip': {
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    },
    '.cm-panels': { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' },
    '.cm-searchMatch': { backgroundColor: 'rgba(245, 158, 11, 0.25)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--bg-elevated)', border: 'none', color: 'var(--text-secondary)' },
  },
  { dark: true }
);

const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: 'var(--accent-indigo, #818cf8)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--accent-emerald, #34d399)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--accent-amber, #f59e0b)' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--accent-cyan, #22d3ee)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--accent-blue, #60a5fa)' },
  { tag: [t.tagName, t.typeName, t.className], color: 'var(--accent-rose, #fb7185)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--text-tertiary)', fontStyle: 'italic' },
  { tag: t.invalid, color: 'var(--accent-rose, #fb7185)' },
]);

export const codeTheme: Extension = [editorTheme, syntaxHighlighting(highlightStyle)];
