import { ChevronDown, X } from 'lucide-react';
import React, { useState } from 'react';

interface RemoveHeadersDisplayProps {
  removeHeaders: string[];
  title: string;
  icon: React.ReactNode;
}

const RemoveHeadersDisplay: React.FC<RemoveHeadersDisplayProps> = ({
  removeHeaders,
  title,
  icon
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHeaders = removeHeaders && removeHeaders.length > 0;

  if (!hasHeaders && !isExpanded) {
    return null;
  }

  return (
    <div className="bg-[rgba(244,63,94,0.1)] rounded-[var(--radius-md)] overflow-hidden border border-[rgba(244,63,94,0.3)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[rgba(244,63,94,0.15)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-[var(--accent-rose)]">{title}</span>
          {hasHeaders && (
            <span className="px-2 py-0.5 bg-[rgba(244,63,94,0.2)] text-[var(--accent-rose)] rounded-full text-xs font-medium">
              {removeHeaders.length}
            </span>
          )}
        </div>
        <div
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="w-4 h-4 text-[var(--accent-rose)]" />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[rgba(244,63,94,0.3)]">
          {hasHeaders ? (
            <div className="p-3 space-y-2">
              {removeHeaders.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-2 p-2 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] border border-[rgba(244,63,94,0.3)]"
                >
                  <X className="w-3 h-3 text-[var(--accent-rose)] flex-shrink-0" />
                  <span className="font-mono text-sm text-[var(--accent-rose)]">{header}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-sm text-[var(--accent-rose)] text-center">
              No headers configured for removal
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RemoveHeadersDisplay;
