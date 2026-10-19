import React from 'react';
import {
  ChevronDown,
  Tag,
  Clock,
  Code,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HttpMethod } from '@/types';
import Badge, { MethodBadge, StatusBadge } from '@/components/ui/Badge';
import Toggle from '@/components/ui/Toggle';
import type { RouteInfo } from '@/hooks/useRouteInfo';

interface RouteItemHeaderProps {
  info: RouteInfo;
  isExpanded: boolean;
  onToggle: (enabled: boolean) => void;
  onExpandToggle: () => void;
}

const RouteItemHeader: React.FC<RouteItemHeaderProps> = ({
  info,
  isExpanded,
  onToggle,
  onExpandToggle,
}) => (
  <div
    className="p-3 cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
    onClick={onExpandToggle}
    role="button"
    aria-expanded={isExpanded}
    aria-label={`${info.url} route, press to ${isExpanded ? 'collapse' : 'expand'}`}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onExpandToggle();
      }
    }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-2">
        {/* Top Row: Badge + URL */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            {info.isInjection ? (
              <span className="ds-badge indigo">
                <Code size={12} className="mr-1" />
                INJ
              </span>
            ) : info.isWebSocket ? (
              <span className="ds-badge violet">
                <MessageSquare size={12} className="mr-1" />
                WS
              </span>
            ) : (
              <MethodBadge method={info.method as HttpMethod} />
            )}
          </div>
          <div
            className={cn(
              'font-mono text-[13px] font-medium truncate text-[var(--text-primary)]',
              !info.isEnabled && 'line-through text-[var(--text-tertiary)]'
            )}
          >
            {info.url}
          </div>
        </div>

        {/* Bottom Row: Tags and Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {info.name && (
              <Badge variant="default" icon={<Tag size={10} />} iconPosition="left">
                {info.name}
              </Badge>
            )}
            {info.isHttp && info.interceptionMode === 'block' && (
              <Badge variant="rose">Block</Badge>
            )}
            {info.isHttp && info.interceptionMode === 'redirect' && (
              <Badge variant="amber">Redirect</Badge>
            )}
            {info.isHttp && info.interceptionMode === 'passthrough' && (
              <Badge variant="info">Passthrough</Badge>
            )}
            {info.isHttp && info.httpConfig.graphqlOperationName && (
              <Badge variant="default">GQL: {info.httpConfig.graphqlOperationName}</Badge>
            )}
            {info.isHttp && info.httpConfig.queryParamRules && info.httpConfig.queryParamRules.length > 0 && (
              <Badge variant="default">{info.httpConfig.queryParamRules.length} params</Badge>
            )}
            {info.isHttp && info.hasAnyHeaders && (
              <Badge variant="info" icon={<Settings size={10} />} iconPosition="left">
                Headers
              </Badge>
            )}
            {info.isInjection && (
              <>
                {info.injConfig.scripts?.length > 0 && info.injConfig.scripts.some(s => s.trim()) && (
                  <Badge variant="default">{info.injConfig.scripts.filter(s => s.trim()).length} script(s)</Badge>
                )}
                {info.injConfig.stylesheets?.length > 0 && info.injConfig.stylesheets.some(s => s.trim()) && (
                  <Badge variant="default">{info.injConfig.stylesheets.filter(s => s.trim()).length} style(s)</Badge>
                )}
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
            {info.isHttp && info.interceptionMode === 'mock' && (
              <StatusBadge status={info.httpConfig.status} />
            )}
            {!info.isInjection && (info.httpConfig.delay ?? 0) > 0 && (
              <Badge variant="default" icon={<Clock size={10} />} iconPosition="left">
                {info.httpConfig.delay}ms
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Keep switch clicks/keys from also expanding the row */}
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Toggle
            checked={info.isEnabled}
            onChange={onToggle}
            size="sm"
            label={`Toggle ${info.url} route`}
          />
        </div>
        <div
          className={cn(
            'p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-transform',
            isExpanded && 'rotate-180'
          )}
        >
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  </div>
);

export default RouteItemHeader;
