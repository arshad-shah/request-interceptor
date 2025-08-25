import React from 'react';
import { X, Import, MessageSquare, Filter, Code2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { MethodBadge, StatusBadge } from '@/components/ui/Badge';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RoutePreviewProps {
  routes: any[];
}

const RoutePreview: React.FC<RoutePreviewProps> = ({ routes }) => {
  return (
    <div className="space-y-3 max-h-80 overflow-auto scrollable-content p-4">
      <AnimatePresence>
        {routes.map((route, index) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm",
              route.routeType === 'websocket' 
                ? "bg-gradient-to-r from-purple-50 to-purple-25 border-purple-200 hover:border-purple-300" 
                : "bg-gradient-to-r from-gray-50 to-white border-gray-200 hover:border-gray-300"
            )}
          >
            {/* Route type indicator and method */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {route.routeType === 'websocket' ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center border border-purple-200">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                    WS
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
                    <Code2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full border",
                    route.method === 'GET' && "bg-blue-100 text-blue-800 border-blue-200",
                    route.method === 'POST' && "bg-green-100 text-green-800 border-green-200",
                    route.method === 'PUT' && "bg-amber-100 text-amber-800 border-amber-200",
                    route.method === 'DELETE' && "bg-red-100 text-red-800 border-red-200",
                    route.method === 'PATCH' && "bg-purple-100 text-purple-800 border-purple-200",
                    route.method === 'OPTIONS' && "bg-gray-100 text-gray-800 border-gray-200",
                    route.method === 'HEAD' && "bg-gray-200 text-gray-800 border-gray-300",
                    !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(route.method) && "bg-gray-100 text-gray-800 border-gray-200"
                  )}>
                    {route.method}
                  </span>
                </div>
              )}
            </div>
            
            {/* Route details */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* URL and name */}
              <div>
                <div className="font-mono text-sm font-semibold text-gray-900 truncate mb-1">
                  {route.url}
                </div>
                {route.name && (
                  <div className="text-xs text-gray-600 font-medium">
                    {route.name}
                  </div>
                )}
              </div>
              
              {/* Route-specific info */}
              <div className="flex items-center gap-2 flex-wrap">
                {route.routeType === 'websocket' && (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-purple-700">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">
                        {(route.incomingRules?.length || 0) + (route.outgoingRules?.length || 0)} rules
                      </span>
                    </div>
                    {route.incomingRules?.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                        {route.incomingRules.length} incoming
                      </span>
                    )}
                    {route.outgoingRules?.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                        {route.outgoingRules.length} outgoing
                      </span>
                    )}
                  </>
                )}
                
                {route.headersOnly && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-medium">
                    <div className="flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Headers-Only
                    </div>
                  </span>
                )}
                
                {route.routeType !== 'websocket' && route.responseBody && (
                  <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Custom Response
                  </span>
                )}
                
                {route.routeType !== 'websocket' && route.modifyHeaders && Object.keys(route.modifyHeaders).length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                    {Object.keys(route.modifyHeaders).length} header{Object.keys(route.modifyHeaders).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="flex-shrink-0">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                route.routeType === 'websocket' ? "bg-purple-400" : "bg-green-400"
              )} />
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
          </motion.div>
        ))}
      </AnimatePresence>
    
    </div>
  );
};

export default RoutePreview;