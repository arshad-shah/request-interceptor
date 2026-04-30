import { HeaderConfig } from '@/types';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

interface HeaderDisplayProps {
  headers: HeaderConfig;
  title: string;
  icon: React.ReactNode;
  emptyMessage?: string;
}

const HeaderDisplay: React.FC<HeaderDisplayProps> = ({
  headers,
  title,
  icon,
  emptyMessage = "No headers configured"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const headerEntries = Object.entries(headers || {});
  const hasHeaders = headerEntries.length > 0;

  if (!hasHeaders && !isExpanded) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-subtle)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-[var(--text-secondary)]">{title}</span>
          {hasHeaders && (
            <span className="px-2 py-0.5 bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)] rounded-full text-xs font-medium">
              {headerEntries.length}
            </span>
          )}
        </div>
        <div
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)]">
          {hasHeaders ? (
            <div className="p-3 space-y-2">
              {headerEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between p-2 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]"
                >
                  <div className="font-mono text-sm min-w-0 flex-1">
                    <div className="font-medium text-[var(--accent-cyan)] break-all">{key}</div>
                    <div className="text-[var(--text-secondary)] break-all">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-sm text-[var(--text-tertiary)] text-center">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderDisplay;
