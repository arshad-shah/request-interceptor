/**
 * Initiator call stack with expand/collapse
 */

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface StackTraceProps {
  stack: Array<{
    functionName: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  }>;
}

export function StackTrace({ stack }: StackTraceProps) {
  const [expanded, setExpanded] = useState(false);
  const displayStack = expanded ? stack : stack.slice(0, 3);

  return (
    <div className="space-y-1">
      {displayStack.map((frame, i) => {
        // Extract filename from URL
        let filename = frame.url;
        try {
          const url = new URL(frame.url);
          filename = url.pathname.split('/').pop() || frame.url;
        } catch {
          filename = frame.url.split('/').pop() || frame.url;
        }

        return (
          <div
            key={i}
            className="flex items-start gap-2 text-[11px] font-mono py-1 px-2 rounded hover:bg-[var(--bg-surface)] group"
          >
            <span className="text-[var(--text-tertiary)] select-none w-4">{i}</span>
            <span className="text-[var(--accent-violet)]">
              {frame.functionName || '(anonymous)'}
            </span>
            <span className="text-[var(--text-tertiary)]">@</span>
            <span
              className="text-[var(--text-secondary)] truncate flex-1"
              title={frame.url}
            >
              {filename}
            </span>
            <span className="text-[var(--accent-cyan)]">
              :{frame.lineNumber}:{frame.columnNumber}
            </span>
            <a
              href={frame.url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={10} className="text-[var(--text-tertiary)]" />
            </a>
          </div>
        );
      })}
      {stack.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-[var(--accent-blue)] hover:underline px-2"
        >
          {expanded ? 'Show less' : `Show ${stack.length - 3} more frames`}
        </button>
      )}
    </div>
  );
}
