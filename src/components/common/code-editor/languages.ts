import type { Extension } from '@codemirror/state';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { xml } from '@codemirror/lang-xml';
import { linter } from '@codemirror/lint';

export type CodeLanguage = 'json' | 'javascript' | 'css' | 'html' | 'xml' | 'text';

/** Map a loose language/mime hint (e.g. "application/json", "js") to a supported language. */
export function normalizeLanguage(hint: string | undefined): CodeLanguage {
  const value = (hint ?? '').toLowerCase();
  if (value.includes('json')) return 'json';
  if (value.includes('javascript') || value === 'js' || value.includes('ecmascript')) return 'javascript';
  if (value.includes('css')) return 'css';
  if (value.includes('html')) return 'html';
  if (value.includes('xml') || value.includes('svg')) return 'xml';
  return 'text';
}

/** CodeMirror extensions for a language; JSON also gets inline parse-error linting when editable. */
export function languageExtensions(language: CodeLanguage, editable: boolean): Extension[] {
  switch (language) {
    case 'json':
      return editable ? [json(), linter(jsonParseLinter(), { delay: 300 })] : [json()];
    case 'javascript':
      return [javascript()];
    case 'css':
      return [css()];
    case 'html':
      return [html()];
    case 'xml':
      return [xml()];
    default:
      return [];
  }
}
