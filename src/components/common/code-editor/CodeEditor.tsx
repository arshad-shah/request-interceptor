import React, { useEffect, useMemo, useState } from 'react';
import { Code, Check, AlertCircle, Copy, RotateCcw, FileCode, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateJson, formatJson } from '@/lib/chrome-api';
import Button from '../../ui/Button';
import { useCodeMirror } from './useCodeMirror';
import { normalizeLanguage, type CodeLanguage } from './languages';

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage | string;
  height?: string | number;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  /** Line numbers and fold markers. */
  showGutter?: boolean;
  fontSize?: number;
  wordWrap?: boolean;
  ariaLabel?: string;
}

const LANGUAGE_BADGES: Record<CodeLanguage, { icon: typeof Code; className: string; name: string }> = {
  json: { icon: FileCode, className: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.15)]', name: 'JSON' },
  javascript: { icon: Code, className: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.15)]', name: 'JavaScript' },
  html: { icon: FileCode, className: 'text-[var(--accent-orange)] bg-[rgba(249,115,22,0.15)]', name: 'HTML' },
  xml: { icon: FileCode, className: 'text-[var(--accent-cyan)] bg-[rgba(6,182,212,0.15)]', name: 'XML' },
  css: { icon: FileCode, className: 'text-[var(--accent-indigo)] bg-[rgba(99,102,241,0.15)]', name: 'CSS' },
  text: { icon: FileCode, className: 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]', name: 'Text' },
};

/**
 * Code editor (CodeMirror 6) with a language badge, JSON validity, copy,
 * format and clear actions. Read-only mode hides the editing actions.
 */
const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language: languageHint = 'json',
  height = 300,
  className,
  placeholder,
  readOnly = false,
  showGutter = true,
  fontSize = 13,
  wordWrap = true,
  ariaLabel,
}) => {
  const language = normalizeLanguage(languageHint);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (language !== 'json' || !value.trim()) {
      setJsonError('');
      return;
    }
    const timer = setTimeout(() => {
      const result = validateJson(value);
      setJsonError(result.isValid ? '' : result.error || 'Invalid JSON');
    }, 200);
    return () => clearTimeout(timer);
  }, [value, language]);

  const isValid = !jsonError;
  const canEdit = !readOnly && !!onChange;

  const format = () => {
    if (!canEdit || language !== 'json') return false;
    const result = validateJson(value);
    if (result.isValid && result.parsed !== undefined) onChange!(formatJson(result.parsed));
    return true;
  };
  const copy = () => {
    navigator.clipboard?.writeText(value).catch(() => {
      /* clipboard can be denied in some contexts; nothing to recover */
    });
    return true;
  };

  const keys = useMemo(
    () => [
      { key: 'Mod-Shift-f', run: format },
      { key: 'Mod-Shift-c', run: copy },
    ],
    // Handlers read the latest value through closures recreated with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, language, canEdit]
  );

  const containerRef = useCodeMirror({
    value,
    onChange: canEdit ? onChange : undefined,
    onCursorChange: setCursor,
    language,
    readOnly: !canEdit,
    lineNumbers: showGutter,
    wrap: wordWrap,
    placeholder,
    ariaLabel: ariaLabel ?? `${LANGUAGE_BADGES[language].name} editor`,
    keys,
  });

  const badge = LANGUAGE_BADGES[language];
  const BadgeIcon = badge.icon;
  const editorHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={cn('relative group', className)}>
      <div
        className={cn(
          'border rounded-[var(--radius-lg)] overflow-hidden bg-[var(--bg-elevated)] transition-colors',
          'focus-within:ring-2 focus-within:ring-[var(--accent-cyan)] focus-within:border-[var(--accent-cyan)]',
          isValid ? 'border-[var(--border-subtle)] hover:border-[var(--border-default)]' : 'border-[var(--accent-rose)]'
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-medium', badge.className)}>
              <BadgeIcon className="w-3 h-3" />
              <span>{badge.name}</span>
            </div>
            {language === 'json' && value.trim() && (
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs',
                  isValid
                    ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)]'
                    : 'bg-[rgba(244,63,94,0.15)] text-[var(--accent-rose)]'
                )}
              >
                {isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{isValid ? 'Valid' : 'Invalid'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={copy} className="text-xs px-2" title="Copy" aria-label="Copy">
              <Copy className="w-3 h-3" />
            </Button>
            {canEdit && language === 'json' && (
              <Button variant="ghost" size="sm" onClick={format} disabled={!isValid} className="text-xs px-2" title="Format (⌘⇧F)" aria-label="Format">
                <Zap className="w-3 h-3" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange!('')}
                className="text-xs px-2 text-[var(--accent-rose)] hover:bg-[rgba(244,63,94,0.15)]"
                title="Clear"
                aria-label="Clear"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          className="[&_.cm-editor]:h-full overflow-hidden"
          style={{ height: editorHeight, ['--code-font-size' as string]: `${fontSize}px` }}
        />

        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
          <span className="font-mono">
            Ln {cursor.line}, Col {cursor.column}
          </span>
          <span>{value.length} chars</span>
        </div>
      </div>

      {jsonError && (
        <div role="alert" className="mt-2 p-3 bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] rounded-[var(--radius-md)]">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--accent-rose)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--accent-rose)]">JSON Error</div>
              <div className="text-xs text-[var(--text-secondary)] font-mono mt-1">{jsonError}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
