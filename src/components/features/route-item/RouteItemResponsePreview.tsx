import React from 'react';
import { Code, Expand, Shrink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JsonTreeViewer } from '@/components/common/JsonTreeViewer';
import type { RouteInfo } from '@/hooks/useRouteInfo';

interface RouteItemResponsePreviewProps {
  info: RouteInfo;
  isResponseExpanded: boolean;
  onToggleExpand: () => void;
}

const RouteItemResponsePreview: React.FC<RouteItemResponsePreviewProps> = ({
  info,
  isResponseExpanded,
  onToggleExpand,
}) => (
  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] overflow-hidden">
    <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
          <Code size={12} className="text-[var(--accent-emerald)]" />
        </div>
        <span className="text-[12px] font-medium text-[var(--text-primary)]">
          {info.isHeadersOnly ? 'Response Body (For Reference)' : 'Response Body'}
        </span>
        {info.isHeadersOnly && (
          <span className="text-[10px] text-[var(--accent-amber)] bg-[rgba(245,158,11,0.15)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
            Not Used
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className="ds-icon-btn"
        aria-label={isResponseExpanded ? 'Collapse response' : 'Expand response'}
      >
        {isResponseExpanded ? <Shrink size={14} /> : <Expand size={14} />}
      </button>
    </div>

    <div
      className={cn(
        'bg-[var(--bg-base)] overflow-auto transition-all',
        isResponseExpanded ? 'max-h-[500px]' : 'max-h-48'
      )}
    >
      {info.parsedResponse ? (
        <JsonTreeViewer
          data={info.parsedResponse}
          maxHeight={isResponseExpanded ? 500 : 180}
          showToolbar={isResponseExpanded}
          initialExpandDepth={isResponseExpanded ? 3 : 1}
          compact={!isResponseExpanded}
          searchable={isResponseExpanded}
        />
      ) : (
        <pre className="p-3 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all">
          {info.responsePreview}
        </pre>
      )}
    </div>
  </div>
);

export default RouteItemResponsePreview;
