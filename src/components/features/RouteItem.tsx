import React, { useState } from 'react';
import {
  ChevronDown,
  Edit,
  Trash2,
  Tag,
  Clock,
  Code,
  Expand,
  Shrink,
  Settings,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare
} from 'lucide-react';
import { parseRouteKey } from '@/lib/chrome-api';
import {
  cn,
  getContentTypeDisplay,
  formatResponsePreview,
  getRouteDescription,
  parseWebSocketKey
} from '@/lib/utils';
import { RouteConfig, WebSocketConfig } from '@/types';
import Badge, { MethodBadge, StatusBadge } from '../ui/Badge';
import Toggle from '../ui/Toggle';
import Button from '../ui/Button';
import CodeHighlighter from '@/components/common/Codehighlighter';
import WebSocketRulesDisplay from './WebSocketRulesDisplay';
import HeaderDisplay from '@/components/common/HeaderDisplay';
import RemoveHeadersDisplay from '@/components/common/RemoveHeadersDisplayProps';
import RouteStatsGrid from '@/components/common/RouteItemStatCard';

interface RouteItemProps {
  routeKey: string;
  config: RouteConfig | WebSocketConfig;
  onEdit: (routeKey: string) => void;
  onDelete: (routeKey: string) => void;
  onToggle: (routeKey: string, enabled: boolean) => void;
}

const RouteItem: React.FC<RouteItemProps> = ({
  routeKey,
  config,
  onEdit,
  onDelete,
  onToggle
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);

  const isWebSocket = routeKey.startsWith('WS:');
  const isEnabled = config.enabled ?? true;

  // Parse route information
  let method = '', url = '', name = '';
  if (isWebSocket) {
    const parsed = parseWebSocketKey(routeKey);
    url = parsed.url;
    name = parsed.name;
  } else {
    const parsed = parseRouteKey(routeKey);
    if (!parsed) {
      method = 'GET';
      url = routeKey;
      name = '';
    } else {
      method = parsed.method;
      url = parsed.url;
      name = parsed.name;
    }
  }

  const timestamp = config.timestamp ? new Date(config.timestamp).toLocaleDateString() : 'N/A';

  // HTTP specific properties
  const httpConfig = config as RouteConfig;
  const responsePreview = !isWebSocket ? formatResponsePreview(httpConfig.response) : '';
  const description = !isWebSocket ? getRouteDescription(method as any, url) : 'WebSocket message interception';
  const contentTypeName = !isWebSocket ? getContentTypeDisplay(httpConfig.contentType) : '';
  const isHeadersOnly = !isWebSocket && (httpConfig.headersOnly || false);

  // WebSocket specific properties
  const wsConfig = config as WebSocketConfig;
  const totalRules = isWebSocket ?
    (wsConfig.incomingRules?.length || 0) + (wsConfig.outgoingRules?.length || 0) : 0;

  // Check if route has header modifications (HTTP only)
  const hasResponseHeaders = !isWebSocket && httpConfig.responseHeaders && Object.keys(httpConfig.responseHeaders).length > 0;
  const hasRequestHeaders = !isWebSocket && httpConfig.requestHeaders && Object.keys(httpConfig.requestHeaders).length > 0;
  const hasRemoveHeaders = !isWebSocket && httpConfig.removeRequestHeaders && httpConfig.removeRequestHeaders.length > 0;
  const hasAnyHeaders = hasResponseHeaders || hasRequestHeaders || hasRemoveHeaders;

  const handleToggle = (enabled: boolean) => {
    onToggle(routeKey, enabled);
  };

  const handleEdit = () => {
    onEdit(routeKey);
  };

  const handleDelete = () => {
    onDelete(routeKey);
  };

  // Determine border color based on route type
  const getBorderColor = () => {
    if (isWebSocket) return 'border-l-[var(--accent-violet)]';
    if (isHeadersOnly) return 'border-l-[var(--accent-cyan)]';
    return 'border-l-[var(--accent-emerald)]';
  };

  return (
    <div
      className={cn(
        'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] border-l-4 rounded-[var(--radius-md)] overflow-hidden',
        getBorderColor(),
        !isEnabled && 'opacity-60'
      )}
    >
      {/* Header */}
      <div
        className="p-3 cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Top Row: Badge + URL */}
            <div className="flex items-center gap-2">
              {/* Route Type Badge */}
              <div className="flex-shrink-0">
                {!isWebSocket ? (
                  <MethodBadge method={method as any} />
                ) : (
                  <span className="ds-badge violet">
                    <MessageSquare size={12} className="mr-1" />
                    WS
                  </span>
                )}
              </div>

              {/* URL */}
              <div
                className={cn(
                  'font-mono text-[13px] font-medium truncate text-[var(--text-primary)]',
                  !isEnabled && 'line-through text-[var(--text-tertiary)]'
                )}
              >
                {url}
              </div>
            </div>

            {/* Bottom Row: Tags and Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Route Name */}
                {name && (
                  <Badge variant="default" icon={<Tag size={10} />} iconPosition="left">
                    {name}
                  </Badge>
                )}

                {/* Headers Indicator */}
                {!isWebSocket && hasAnyHeaders && (
                  <Badge variant="info" icon={<Settings size={10} />} iconPosition="left">
                    Headers
                  </Badge>
                )}
              </div>

              {/* Quick Stats */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                {!isWebSocket && !isHeadersOnly && (
                  <>
                    <StatusBadge status={httpConfig.status} />
                    {(config.delay ?? 0) > 0 && (
                      <Badge variant="default" icon={<Clock size={10} />} iconPosition="left">
                        {config.delay}ms
                      </Badge>
                    )}
                  </>
                )}

                {(isHeadersOnly || isWebSocket) && (config.delay ?? 0) > 0 && (
                  <Badge variant="default" icon={<Clock size={10} />} iconPosition="left">
                    {config.delay}ms
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Toggle
              checked={isEnabled}
              onChange={handleToggle}
              size="sm"
            />

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

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div className="p-3 space-y-3">
            {/* Description */}
            <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
              <p className="text-[12px] text-[var(--text-secondary)]">
                {description}
                {isHeadersOnly && (
                  <span className="ml-1 text-[var(--accent-cyan)]">
                    (Headers only, original response preserved)
                  </span>
                )}
                {isWebSocket && (
                  <span className="ml-1 text-[var(--accent-violet)]">
                    (Real-time message processing)
                  </span>
                )}
              </p>
            </div>

            <RouteStatsGrid
              isHeadersOnly={isHeadersOnly}
              isWebSocket={isWebSocket}
              totalRules={totalRules}
              httpConfig={httpConfig}
              config={config}
              contentTypeName={contentTypeName}
              timestamp={timestamp}
            />

            {/* WebSocket Rules section */}
            {isWebSocket && (
              <div className="space-y-3">
                <div className="grid gap-3">
                  <WebSocketRulesDisplay
                    rules={wsConfig.incomingRules || []}
                    title="Incoming Message Rules"
                    icon={<ArrowDownLeft size={14} className="text-[var(--accent-emerald)]" />}
                    direction="incoming"
                  />

                  <WebSocketRulesDisplay
                    rules={wsConfig.outgoingRules || []}
                    title="Outgoing Message Rules"
                    icon={<ArrowUpRight size={14} className="text-[var(--accent-cyan)]" />}
                    direction="outgoing"
                  />
                </div>
              </div>
            )}

            {/* HTTP Headers section */}
            {!isWebSocket && hasAnyHeaders && (
              <div className="space-y-3">
                <div className="grid gap-3">
                  {hasResponseHeaders && (
                    <HeaderDisplay
                      headers={httpConfig.responseHeaders || {}}
                      title={isHeadersOnly ? 'Response Headers (Added to Real Response)' : 'Response Headers'}
                      icon={<ArrowDownLeft size={14} className="text-[var(--accent-emerald)]" />}
                      emptyMessage="No response headers configured"
                    />
                  )}

                  {hasRequestHeaders && (
                    <HeaderDisplay
                      headers={httpConfig.requestHeaders || {}}
                      title="Request Headers (Added to Outgoing Request)"
                      icon={<ArrowUpRight size={14} className="text-[var(--accent-cyan)]" />}
                      emptyMessage="No request headers configured"
                    />
                  )}

                  {hasRemoveHeaders && (
                    <RemoveHeadersDisplay
                      removeHeaders={httpConfig.removeRequestHeaders || []}
                      title="Remove Request Headers"
                      icon={<Shield size={14} className="text-[var(--accent-rose)]" />}
                    />
                  )}
                </div>
              </div>
            )}

            {/* HTTP Response preview */}
            {!isWebSocket && (!isHeadersOnly || (httpConfig.response && String(httpConfig.response).trim())) && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
                      <Code size={12} className="text-[var(--accent-emerald)]" />
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">
                      {isHeadersOnly ? 'Response Body (For Reference)' : 'Response Body'}
                    </span>
                    {isHeadersOnly && (
                      <span className="text-[10px] text-[var(--accent-amber)] bg-[rgba(245,158,11,0.15)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                        Not Used
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsResponseExpanded(!isResponseExpanded);
                    }}
                    className="ds-icon-btn"
                  >
                    {isResponseExpanded ? <Shrink size={14} /> : <Expand size={14} />}
                  </button>
                </div>

                <div
                  className={cn(
                    'bg-[var(--bg-base)] overflow-auto transition-all',
                    isResponseExpanded ? 'max-h-96' : 'max-h-40'
                  )}
                >
                  <CodeHighlighter code={responsePreview} language="json" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="default"
                size="sm"
                leftIcon={<Edit size={14} />}
                onClick={handleEdit}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteItem;
