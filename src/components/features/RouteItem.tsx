import React, { useState, useMemo } from 'react';
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
  parseWebSocketKey,
  parseInjectionKey
} from '@/lib/utils';
import { RouteConfig, WebSocketConfig, InjectionConfig, InterceptionMode } from '@/types';
import Badge, { MethodBadge, StatusBadge } from '../ui/Badge';
import Toggle from '../ui/Toggle';
import Button from '../ui/Button';
import { JsonTreeViewer } from '@/components/common/JsonTreeViewer';
import WebSocketRulesDisplay from './WebSocketRulesDisplay';
import HeaderDisplay from '@/components/common/HeaderDisplay';
import RemoveHeadersDisplay from '@/components/common/RemoveHeadersDisplayProps';
import RouteStatsGrid from '@/components/common/RouteItemStatCard';

interface RouteItemProps {
  routeKey: string;
  config: RouteConfig | WebSocketConfig | InjectionConfig;
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
  const isInjection = routeKey.startsWith('INJ:');
  const isHttp = !isWebSocket && !isInjection;
  const isEnabled = config.enabled ?? true;

  // Parse route information
  let method = '', url = '', name = '';
  if (isWebSocket) {
    const parsed = parseWebSocketKey(routeKey);
    url = parsed.url;
    name = parsed.name;
  } else if (isInjection) {
    const parsed = parseInjectionKey(routeKey);
    url = parsed.urlPattern;
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
  const responsePreview = isHttp ? formatResponsePreview(httpConfig.response) : '';
  const description = isInjection ? 'Script/CSS injection'
    : isWebSocket ? 'WebSocket message interception'
    : getRouteDescription(method as any, url);
  const contentTypeName = isHttp ? getContentTypeDisplay(httpConfig.contentType) : '';
  const interceptionMode: InterceptionMode = isHttp
    ? (httpConfig.interceptionMode || (httpConfig.headersOnly ? 'passthrough' : 'mock'))
    : 'mock';
  const isHeadersOnly = isHttp && interceptionMode === 'passthrough';

  // Injection specific properties
  const injConfig = config as InjectionConfig;

  // Parse response for tree view
  const parsedResponse = useMemo(() => {
    if (isWebSocket || !httpConfig.response) return null;
    try {
      if (typeof httpConfig.response === 'object') {
        return httpConfig.response;
      }
      return JSON.parse(String(httpConfig.response));
    } catch {
      return null;
    }
  }, [httpConfig.response, isWebSocket]);

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

  const getBorderColor = () => {
    if (isWebSocket) return 'border-l-[var(--accent-violet)]';
    if (isInjection) return 'border-l-[var(--accent-indigo)]';
    if (interceptionMode === 'block') return 'border-l-[var(--accent-rose)]';
    if (interceptionMode === 'redirect') return 'border-l-[var(--accent-amber)]';
    if (interceptionMode === 'passthrough') return 'border-l-[var(--accent-cyan)]';
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
                {isInjection ? (
                  <span className="ds-badge" style={{ color: 'var(--accent-indigo)', background: 'rgba(99,102,241,0.15)' }}>
                    <Code size={12} className="mr-1" />
                    INJ
                  </span>
                ) : isWebSocket ? (
                  <span className="ds-badge violet">
                    <MessageSquare size={12} className="mr-1" />
                    WS
                  </span>
                ) : (
                  <MethodBadge method={method as any} />
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

                {/* Mode Badge */}
                {isHttp && interceptionMode === 'block' && (
                  <Badge variant="rose">Block</Badge>
                )}
                {isHttp && interceptionMode === 'redirect' && (
                  <Badge variant="amber">Redirect</Badge>
                )}
                {isHttp && interceptionMode === 'passthrough' && (
                  <Badge variant="info">Passthrough</Badge>
                )}

                {/* GraphQL Operation */}
                {isHttp && httpConfig.graphqlOperationName && (
                  <Badge variant="default">GQL: {httpConfig.graphqlOperationName}</Badge>
                )}

                {/* Query Params Count */}
                {isHttp && httpConfig.queryParamRules && httpConfig.queryParamRules.length > 0 && (
                  <Badge variant="default">{httpConfig.queryParamRules.length} params</Badge>
                )}

                {/* Headers Indicator */}
                {isHttp && hasAnyHeaders && (
                  <Badge variant="info" icon={<Settings size={10} />} iconPosition="left">
                    Headers
                  </Badge>
                )}

                {/* Injection details */}
                {isInjection && (
                  <>
                    {injConfig.scripts?.length > 0 && injConfig.scripts.some(s => s.trim()) && (
                      <Badge variant="default">{injConfig.scripts.filter(s => s.trim()).length} script(s)</Badge>
                    )}
                    {injConfig.stylesheets?.length > 0 && injConfig.stylesheets.some(s => s.trim()) && (
                      <Badge variant="default">{injConfig.stylesheets.filter(s => s.trim()).length} style(s)</Badge>
                    )}
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                {isHttp && interceptionMode === 'mock' && (
                  <StatusBadge status={httpConfig.status} />
                )}

                {!isInjection && ((config as any).delay ?? 0) > 0 && (
                  <Badge variant="default" icon={<Clock size={10} />} iconPosition="left">
                    {(config as any).delay}ms
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
                {isHttp && interceptionMode === 'block' && (
                  <span className="ml-1 text-[var(--accent-rose)]">(Request blocked)</span>
                )}
                {isHttp && interceptionMode === 'redirect' && (
                  <span className="ml-1 text-[var(--accent-amber)]">
                    → {httpConfig.redirectUrl}
                  </span>
                )}
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
                {isInjection && (
                  <span className="ml-1 text-[var(--accent-indigo)]">
                    (Inject at {injConfig.injectAt === 'document_start' ? 'document start' : 'document end'})
                  </span>
                )}
              </p>
            </div>

            {!isInjection && (
              <RouteStatsGrid
                isHeadersOnly={isHeadersOnly}
                isWebSocket={isWebSocket}
                totalRules={totalRules}
                httpConfig={httpConfig}
                config={config as any}
                contentTypeName={contentTypeName}
                timestamp={timestamp}
              />
            )}

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
            {isHttp && hasAnyHeaders && (
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
            {isHttp && interceptionMode !== 'block' && (!isHeadersOnly || (httpConfig.response && String(httpConfig.response).trim())) && (
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
                    isResponseExpanded ? 'max-h-[500px]' : 'max-h-48'
                  )}
                >
                  {parsedResponse ? (
                    <JsonTreeViewer
                      data={parsedResponse}
                      maxHeight={isResponseExpanded ? 500 : 180}
                      showToolbar={isResponseExpanded}
                      initialExpandDepth={isResponseExpanded ? 3 : 1}
                      compact={!isResponseExpanded}
                      searchable={isResponseExpanded}
                    />
                  ) : (
                    <pre className="p-3 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all">
                      {responsePreview}
                    </pre>
                  )}
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
