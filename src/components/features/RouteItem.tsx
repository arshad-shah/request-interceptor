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
  const isEnabled = config.enabled ?? true; // Default to enabled if undefined
  
  // Parse route information
  let method = '', url = '', name = '';
  if (isWebSocket) {
    const parsed = parseWebSocketKey(routeKey);
    url = parsed.url;
    name = parsed.name;
  } else {
    const parsed = parseRouteKey(routeKey);
    if (!parsed) {
      // Fallback for invalid route keys
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative bg-white border rounded-xl overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-gray-200/50",
        !isEnabled && "opacity-70",
        isEnabled ? "shadow-sm border-gray-200" : "border-gray-300",
        // Enhanced left border for route types
        isWebSocket && "border-l-4 border-l-purple-500 hover:border-l-purple-600",
        !isWebSocket && isHeadersOnly && "border-l-4 border-l-blue-500 hover:border-l-blue-600",
        !isWebSocket && !isHeadersOnly && "border-l-4 border-l-green-500 hover:border-l-green-600"
      )}
      whileHover={{ y: -2 }}
    >

      {/* Header */}
      <motion.div 
        className="p-4 cursor-pointer hover:bg-gray-50/80 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Top Row: Badge + URL */}
            <div className="flex items-center gap-3">
              {/* Route Type Badge */}
              <div className="flex-shrink-0">
                {!isWebSocket ? (
                  <MethodBadge method={method as any} className="shadow-sm" />
                ) : (
                  <motion.div 
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-100 border border-purple-200 text-purple-700 rounded-lg font-medium text-sm"
                    whileHover={{ scale: 1.05 }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WS</span>
                  </motion.div>
                )}
              </div>

              {/* URL */}
              <div className="flex-1 min-w-0">
                <motion.div
                  className={cn(
                    "font-mono text-base font-semibold truncate transition-colors duration-200",
                    !isEnabled && "line-through text-gray-500",
                    isEnabled && "text-gray-900 group-hover:text-gray-700"
                  )}
                  layoutId={`url-${routeKey}`}
                >
                  {url}
                </motion.div>
              </div>
            </div>

            {/* Bottom Row: Tags and Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Route Name */}
                {name && (
                  <Badge variant='default' icon={<Tag className="w-3 h-3" />} iconPosition="left">
                    <span className="font-medium">{name}</span>
                  </Badge>
                )}
                
                {/* Headers Indicator */}
                {!isWebSocket && hasAnyHeaders && (
                  <Badge variant='info' icon={<Settings className="w-3 h-3" />} iconPosition="left">
                    <span className="font-medium">Headers</span>
                  </Badge>
                )}
              </div>

              {/* Quick Stats */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                {!isWebSocket && !isHeadersOnly && (
                  <>
                    <StatusBadge status={httpConfig.status} className="shadow-sm" />
                    {(config.delay ?? 0) > 0 && (
                      <Badge variant='default' icon={<Clock className="w-3 h-3" />} iconPosition="left">
                        <span className="font-medium">{config.delay ?? 0}ms</span>
                      </Badge>
                    )}
                  </>
                )}
                
                {(isHeadersOnly || isWebSocket) && (config.delay ?? 0) > 0 && (
                  <Badge variant='default' icon={<Clock className="w-3 h-3" />} iconPosition="left">
                        <span className="font-medium">{config.delay ?? 0}ms</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Toggle 
                checked={isEnabled}
                onChange={handleToggle}
                size="md"
              />
            </motion.div>

            {/* Expand Indicator */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-gray-100 bg-gray-50/30"
          >
            <div className="p-2 space-y-2">
              {/* Description */}
              <motion.div 
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm text-gray-700 leading-relaxed">
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
              </motion.div>

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
                <motion.div 
                  className="space-y-4"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  
                  <div className="grid gap-4">
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
                </motion.div>
              )}

              {/* HTTP Headers section */}
              {!isWebSocket && hasAnyHeaders && (
                <motion.div 
                  className="space-y-4"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  
                  <div className="grid gap-4">
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
                </motion.div>
              )}

              {/* HTTP Response preview */}
              {!isWebSocket && (!isHeadersOnly || (httpConfig.response && String(httpConfig.response).trim())) && (
                <motion.div 
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                        <Code className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {isHeadersOnly ? "Response Body (For Reference)" : "Response Body"}
                      </span>
                      {isHeadersOnly && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          Not Used
                        </span>
                      )}
                    </div>
                    <motion.button
                      onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                      className="p-1.5 rounded-md hover:bg-gray-200 transition-colors duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isResponseExpanded ? (
                        <Shrink className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ExpandIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </motion.button>
                  </div>
                  
                  <motion.div 
                    className={cn(
                      "bg-gray-900 text-gray-100 overflow-auto transition-all duration-300",
                      isResponseExpanded ? "max-h-96" : "max-h-40"
                    )}
                    animate={{ maxHeight: isResponseExpanded ? 384 : 160 }}
                  >
                      <CodeHighlighter code={responsePreview} language='json' />
                  </motion.div>
                </motion.div>
              )}

              {/* Enhanced Actions */}
              <motion.div 
                className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit className="w-4 h-4" />}
                  onClick={handleEdit}
                  className="hover:shadow-md transition-shadow duration-200"
                >
                  Edit Route
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={handleDelete}
                  className="hover:shadow-md transition-shadow duration-200"
                >
                  Delete
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RouteItem;