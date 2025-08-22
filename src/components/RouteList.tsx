import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Edit, 
  Trash2, 
  Tag, 
  Clock, 
  Code, 
  ExpandIcon,
  Shrink,
  Route,
  Search,
  X,
  Plus,
  Settings,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { parseRouteKey, chromeApi } from '@/lib/chrome-api';
import { 
  cn,
  getContentTypeDisplay,
  formatResponsePreview,
  getRouteDescription 
} from '@/lib/utils';
import { RouteConfig, HeaderConfig, WebSocketConfig, WebSocketRule } from '@/types';
import { MethodBadge, StatusBadge } from './ui/Badge';
import Toggle from './ui/Toggle';
import Button from './ui/Button';
import { ConfirmDialog } from './ui/Dialog';
import CodeHighlighter from '@/components/Codehighlighter';

interface RouteItemProps {
  routeKey: string;
  config: RouteConfig | WebSocketConfig;
  onEdit: (routeKey: string) => void;
  onDelete: (routeKey: string) => void;
  onToggle: (routeKey: string, enabled: boolean) => void;
}

// Helper function for parsing WebSocket keys
function parseWebSocketKey(routeKey: string) {
  const remaining = routeKey.substring(3); // Remove 'WS:'
  const pipeIndex = remaining.indexOf('|');
  
  if (pipeIndex === -1) {
    return { url: remaining, name: '' };
  }
  
  const url = remaining.substring(0, pipeIndex);
  const name = remaining.substring(pipeIndex + 1);
  
  return { url, name };
}

// Mode badge component
const ModeBadge: React.FC<{ 
  headersOnly?: boolean; 
  isWebSocket?: boolean; 
  ruleCount?: number;
}> = ({ headersOnly, isWebSocket, ruleCount = 0 }) => {
  if (isWebSocket) {
    return (
      <div className="flex items-center gap-1">
        <MessageSquare className="w-3 h-3 text-purple-500" />
        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
          WebSocket ({ruleCount} rules)
        </span>
      </div>
    );
  }
  
  if (headersOnly) {
    return (
      <div className="flex items-center gap-1">
        <Filter className="w-3 h-3 text-blue-500" />
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          Headers-Only
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <Code className="w-3 h-3 text-green-500" />
      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
        Full Response
      </span>
    </div>
  );
};

// WebSocket Rules Display Component
const WebSocketRulesDisplay: React.FC<{
  rules: WebSocketRule[];
  title: string;
  icon: React.ReactNode;
  direction: 'incoming' | 'outgoing';
}> = ({ rules, title, icon, direction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const enabledRules = rules.filter(rule => rule.enabled);
  const hasRules = rules.length > 0;

  if (!hasRules && !isExpanded) {
    return null;
  }

  return (
    <div className="bg-purple-50 rounded-lg overflow-hidden border border-purple-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-purple-700">{title}</span>
          {hasRules && (
            <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs font-medium">
              {enabledRules.length}/{rules.length}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-purple-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-purple-200 overflow-hidden"
          >
            {hasRules ? (
              <div className="p-3 space-y-2">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className={cn(
                      "p-2 rounded border",
                      rule.enabled 
                        ? "bg-white border-purple-200" 
                        : "bg-gray-50 border-gray-200 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded font-medium",
                        rule.type === 'replace' ? 'bg-blue-100 text-blue-700' :
                        rule.type === 'block' ? 'bg-red-100 text-red-700' :
                        'bg-green-100 text-green-700'
                      )}>
                        {rule.type.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {rule.matchType.toUpperCase()}
                      </span>
                      {!rule.enabled && (
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                          DISABLED
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs">
                      <span className="font-medium text-gray-900">Match:</span>
                      <span className="ml-2 font-mono text-gray-600 break-all">{rule.match}</span>
                    </div>
                    
                    {rule.replacement && (
                      <div className="text-xs mt-1">
                        <span className="font-medium text-gray-900">
                          {rule.type === 'inject' ? 'Inject:' : 'Replace:'}
                        </span>
                        <span className="ml-2 font-mono text-gray-600 break-all">{rule.replacement}</span>
                      </div>
                    )}
                    
                    {rule.description && (
                      <div className="text-xs text-gray-500 mt-1">{rule.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-purple-600 text-center">
                No {direction} rules configured
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const isEnabled = config.enabled !== false;
  
  // Parse route information
  let method = '', url = '', name = '';
  if (isWebSocket) {
    const parsed = parseWebSocketKey(routeKey);
    url = parsed.url;
    name = parsed.name;
  } else {
    const parsed = parseRouteKey(routeKey);
    method = parsed.method;
    url = parsed.url;
    name = parsed.name;
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "bg-white border border-gray-200 rounded-lg overflow-hidden",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "relative",
        !isEnabled && "opacity-60",
        isWebSocket && "border-l-4 border-l-purple-500",
        !isWebSocket && isHeadersOnly && "border-l-4 border-l-blue-500"
      )}
    >
      {/* Method color indicator (only for full HTTP interception) */}
      {!isWebSocket && !isHeadersOnly && (
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full",
          method === 'GET' && "bg-blue-500",
          method === 'POST' && "bg-green-500",
          method === 'PUT' && "bg-amber-500",
          method === 'DELETE' && "bg-red-500",
          method === 'PATCH' && "bg-purple-500"
        )} />
      )}

      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {!isWebSocket && <MethodBadge method={method as any} />}
          {isWebSocket && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                WS
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-mono text-sm font-medium truncate",
              !isEnabled && "line-through text-gray-500"
            )}>
              {url}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {name && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {name}
                  </span>
                </div>
              )}
              <ModeBadge 
                headersOnly={isHeadersOnly} 
                isWebSocket={isWebSocket}
                ruleCount={totalRules}
              />
              {!isWebSocket && hasAnyHeaders && (
                <div className="flex items-center gap-1">
                  <Settings className="w-3 h-3 text-primary-500" />
                  <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                    Headers
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status and delay indicators - only show for HTTP full interception */}
          {!isWebSocket && !isHeadersOnly && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <StatusBadge status={httpConfig.status} />
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{config.delay}ms</span>
              </div>
            </div>
          )}

          {/* For headers-only mode or WebSocket, show delay only if > 0 */}
          {(isHeadersOnly || isWebSocket) && (config.delay ?? 0) > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{config.delay ?? 0}ms</span>
            </div>
          )}

          {/* Toggle */}
          <Toggle 
            checked={isEnabled}
            onChange={handleToggle}
            size="sm"
          />

          {/* Expand indicator */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 space-y-4">
              {/* Description */}
              <p className="text-sm text-gray-600">
                {description}
                {isHeadersOnly && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Headers will be modified, original response preserved)
                  </span>
                )}
                {isWebSocket && (
                  <span className="ml-2 text-purple-600 font-medium">
                    (Real-time message processing)
                  </span>
                )}
              </p>

              {/* Route info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-3 rounded-lg">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Type
                  </div>
                  <div className="mt-1">
                    <ModeBadge 
                      headersOnly={isHeadersOnly} 
                      isWebSocket={isWebSocket}
                      ruleCount={totalRules}
                    />
                  </div>
                </div>
                
                {!isWebSocket && !isHeadersOnly && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={httpConfig.status} />
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Delay
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {config.delay ?? 0}ms
                  </div>
                </div>
                
                {!isWebSocket && !isHeadersOnly && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Content Type
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {contentTypeName}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Added
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {timestamp}
                  </div>
                </div>
              </div>

              {/* WebSocket Rules section */}
              {isWebSocket && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">WebSocket Rules</span>
                  </div>
                  
                  <div className="space-y-3">
                    <WebSocketRulesDisplay
                      rules={wsConfig.incomingRules || []}
                      title="Incoming Message Rules"
                      icon={<ArrowDownLeft className="w-4 h-4 text-green-600" />}
                      direction="incoming"
                    />
                    
                    <WebSocketRulesDisplay
                      rules={wsConfig.outgoingRules || []}
                      title="Outgoing Message Rules"
                      icon={<ArrowUpRight className="w-4 h-4 text-blue-600" />}
                      direction="outgoing"
                    />
                  </div>
                </div>
              )}

              {/* HTTP Headers section */}
              {!isWebSocket && hasAnyHeaders && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Header Configuration</span>
                  </div>
                  
                  <div className="space-y-3">
                    {hasResponseHeaders && (
                      <HeaderDisplay
                        headers={httpConfig.responseHeaders || {}}
                        title={isHeadersOnly ? "Response Headers (Added to Real Response)" : "Response Headers"}
                        icon={<ArrowDownLeft className="w-4 h-4 text-green-600" />}
                        emptyMessage="No response headers configured"
                      />
                    )}
                    
                    {hasRequestHeaders && (
                      <HeaderDisplay
                        headers={httpConfig.requestHeaders || {}}
                        title="Request Headers (Added to Outgoing Request)"
                        icon={<ArrowUpRight className="w-4 h-4 text-blue-600" />}
                        emptyMessage="No request headers configured"
                      />
                    )}
                    
                    {hasRemoveHeaders && (
                      <RemoveHeadersDisplay
                        removeHeaders={httpConfig.removeRequestHeaders || []}
                        title="Remove Request Headers"
                        icon={<Shield className="w-4 h-4 text-red-600" />}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* HTTP Response preview - only show for full interception or if response is provided in headers-only mode */}
              {!isWebSocket && (!isHeadersOnly || (httpConfig.response && String(httpConfig.response).trim())) && (
                <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {isHeadersOnly ? "Response Body (For Reference)" : "Response Body"}
                      </span>
                      {isHeadersOnly && (
                        <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-0.5 rounded">
                          Not Used
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {isResponseExpanded ? (
                        <Shrink className="w-4 h-4" />
                      ) : (
                        <ExpandIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  <div className={cn(
                    "bg-gray-900 text-gray-100 p-3 overflow-auto transition-all duration-200",
                    isResponseExpanded ? "max-h-80" : "max-h-32"
                  )}>
                    <CodeHighlighter code={responsePreview} language='json' />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit className="w-4 h-4" />}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Header display components (unchanged from previous implementation)
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
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {hasHeaders && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {headerEntries.length}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 overflow-hidden"
          >
            {hasHeaders ? (
              <div className="p-3 space-y-2">
                {headerEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <div className="font-mono text-sm min-w-0 flex-1">
                      <div className="font-medium text-gray-900 break-all">{key}</div>
                      <div className="text-gray-600 break-all">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-gray-500 text-center">
                {emptyMessage}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
    <div className="bg-red-50 rounded-lg overflow-hidden border border-red-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-red-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-red-700">{title}</span>
          {hasHeaders && (
            <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-medium">
              {removeHeaders.length}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-red-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-red-200 overflow-hidden"
          >
            {hasHeaders ? (
              <div className="p-3 space-y-2">
                {removeHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-2 p-2 bg-white rounded border border-red-200"
                  >
                    <X className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <span className="font-mono text-sm text-red-900">{header}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-red-600 text-center">
                No headers configured for removal
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Empty state components
const EmptyState: React.FC<{ onAddRoute: () => void }> = ({ onAddRoute }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-full flex items-center justify-center">
      <Route className="w-8 h-8 text-primary-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No routes configured yet</h3>
    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
      Add your first route to start intercepting requests. You can intercept HTTP requests, 
      modify headers, or process WebSocket messages in real-time.
    </p>
    <Button variant="primary" onClick={onAddRoute} leftIcon={<Plus className="w-4 h-4" />}>
      Add Route
    </Button>
  </div>
);

const FilterEmptyState: React.FC<{ onClearFilters: () => void }> = ({ onClearFilters }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
      <Search className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching routes found</h3>
    <p className="text-gray-500 mb-6">
      Try adjusting your search or filter criteria.
    </p>
    <Button variant="secondary" onClick={onClearFilters} leftIcon={<X className="w-4 h-4" />}>
      Clear Filters
    </Button>
  </div>
);

// Main RouteList component
const RouteList: React.FC = () => {
  const { 
    routes, 
    filters, 
    setActiveTab, 
    setEditingRoute, 
    addNotification,
    removeRoute,
    toggleRoute,
    setFilters 
  } = useAppStore();
  
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; routeKey?: string }>({
    isOpen: false
  });

  // Filter routes based on search and method filter
  const filteredRoutes = Object.entries(routes).filter(([routeKey, config]) => {
    // Check route type filter
    if (filters.routeType && filters.routeType !== 'all') {
      const isWebSocket = routeKey.startsWith('WS:');
      if (filters.routeType === 'websocket' && !isWebSocket) return false;
      if (filters.routeType === 'http' && isWebSocket) return false;
    }
    
    // For WebSocket routes, skip method filter
    if (routeKey.startsWith('WS:')) {
      const { url, name } = parseWebSocketKey(routeKey);
      
      // Search filter for WebSocket
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          url.toLowerCase().includes(searchLower) ||
          name?.toLowerCase().includes(searchLower) ||
          'websocket'.includes(searchLower)
        );
      }
      return true;
    }
    
    // For HTTP routes
    const { method, url, name } = parseRouteKey(routeKey);
    
    // Method filter
    if (filters.method !== 'all' && method !== filters.method) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        url.toLowerCase().includes(searchLower) ||
        method.toLowerCase().includes(searchLower) ||
        name?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const handleEditRoute = (routeKey: string) => {
    setEditingRoute(routeKey);
    setActiveTab('add');
  };

  const handleDeleteRoute = (routeKey: string) => {
    setDeleteDialog({ isOpen: true, routeKey });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.routeKey) return;
    
    try {
      await chromeApi.removeRoute(deleteDialog.routeKey);
      removeRoute(deleteDialog.routeKey);
      addNotification('Success', 'Route removed successfully');
    } catch (error) {
      addNotification('Error', 'Failed to remove route', 'error');
    }
    
    setDeleteDialog({ isOpen: false });
  };

  const handleToggleRoute = async (routeKey: string, enabled: boolean) => {
    try {
      // First update the background script
      await chromeApi.toggleRoute(routeKey, enabled);
      
      // Then update the local state using the store's toggleRoute method
      toggleRoute(routeKey, enabled);
      
      addNotification(
        'Success', 
        enabled ? 'Route enabled successfully' : 'Route disabled successfully'
      );
    } catch (error) {
      console.error('Failed to toggle route:', error);
      addNotification('Error', 'Failed to toggle route', 'error');
    }
  };

  const handleClearFilters = () => {
    setFilters({ search: '', method: 'all', routeType: 'all' });
  };

  if (Object.keys(routes).length === 0) {
    return <EmptyState onAddRoute={() => setActiveTab('add')} />;
  }

  if (filteredRoutes.length === 0 && (filters.search || filters.method !== 'all' || filters.routeType !== 'all')) {
    return <FilterEmptyState onClearFilters={handleClearFilters} />;
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredRoutes.map(([routeKey, config]) => (
            <RouteItem
              key={routeKey}
              routeKey={routeKey}
              config={config}
              onEdit={handleEditRoute}
              onDelete={handleDeleteRoute}
              onToggle={handleToggleRoute}
            />
          ))}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete Route"
        message={`Are you sure you want to delete this route? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
};

export default RouteList;