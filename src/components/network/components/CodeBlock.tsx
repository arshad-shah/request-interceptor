/**
 * Code block with syntax highlighting and a JSON tree/raw toggle
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { JsonTreeViewer } from '../../common/JsonTreeViewer';
import { CodeView } from '../../common/code-editor';
import { CopyButton } from './CopyButton';

interface CodeBlockProps {
  content: string;
  language?: string;
  maxHeight?: number;
  searchTerm?: string;
  showCopy?: boolean;
  wrapLines?: boolean;
  /** Enable tree view for JSON (default: true for json language) */
  enableTreeView?: boolean;
  /** Default view mode for JSON */
  defaultView?: 'tree' | 'raw';
}

export function CodeBlock({
  content,
  language = 'text',
  maxHeight = 400,
  searchTerm: _searchTerm,
  showCopy = true,
  wrapLines = true,
  enableTreeView = true,
  defaultView = 'tree',
}: CodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>(defaultView);

  // Check if content is valid JSON
  const parsedJson = useMemo(() => {
    if (language === 'json' && enableTreeView) {
      try {
        return JSON.parse(content);
      } catch {
        return null;
      }
    }
    return null;
  }, [content, language, enableTreeView]);

  const isJsonTreeAvailable = parsedJson !== null;

  // Format JSON if applicable
  const formattedContent = useMemo(() => {
    if (language === 'json') {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }
    return content;
  }, [content, language]);

  const lineCount = useMemo(() => formattedContent.split('\n').length, [formattedContent]);
  const isLong = lineCount > 50;

  // If JSON tree view is available and selected, use it
  if (isJsonTreeAvailable && viewMode === 'tree') {
    return (
      <div className="relative">
        {/* View toggle */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
          <button
            onClick={() => setViewMode('tree')}
            className="px-2 py-1 text-[10px] font-medium rounded transition-colors bg-[var(--accent-indigo)] text-white"
          >
            Tree
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className="px-2 py-1 text-[10px] font-medium rounded transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Raw
          </button>
        </div>
        <JsonTreeViewer
          data={parsedJson}
          maxHeight={maxHeight}
          showToolbar={true}
          initialExpandDepth={3}
          compact={false}
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* View toggle for JSON */}
      {isJsonTreeAvailable && (
        <div className="absolute top-2 right-12 z-10 flex items-center gap-1 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
          <button
            onClick={() => setViewMode('tree')}
            className={clsx(
              'px-2 py-1 text-[10px] font-medium rounded transition-colors',
              viewMode === 'tree'
                ? 'bg-[var(--accent-indigo)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            Tree
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={clsx(
              'px-2 py-1 text-[10px] font-medium rounded transition-colors',
              viewMode === 'raw'
                ? 'bg-[var(--accent-indigo)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            Raw
          </button>
        </div>
      )}
      {showCopy && (
        <CopyButton
          text={formattedContent}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Copy code"
        />
      )}
      <div
        className="overflow-auto rounded-[var(--radius-md)]"
        style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
      >
        <CodeView content={formattedContent} language={language} wrap={wrapLines} />
      </div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 text-[11px] text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 
            bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] rounded-b-[var(--radius-md)]"
        >
          {isExpanded ? 'Show less' : `Show all (${lineCount} lines)`}
        </button>
      )}
    </div>
  );
}
