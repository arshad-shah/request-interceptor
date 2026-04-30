import React from 'react';
import { MessageSquare, Filter, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoutePreviewProps {
  routes: any[];
}

const RoutePreview: React.FC<RoutePreviewProps> = ({ routes }) => {
  return (
    <div className="space-y-3 max-h-80 overflow-auto scrollable-content p-4">
      {routes.map((route, index) => (
        <div
          key={route.id || index}
          className={cn(
            "group relative flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border transition-all duration-200",
            route.routeType === 'websocket'
              ? "bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.3)] hover:border-[var(--accent-violet)]"
              : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
          )}
        >
          {/* Route type indicator and method */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {route.routeType === 'websocket' ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-[rgba(139,92,246,0.15)] rounded-[var(--radius-md)] flex items-center justify-center border border-[rgba(139,92,246,0.3)]">
                  <MessageSquare className="w-5 h-5 text-[var(--accent-violet)]" />
                </div>
                <span className="text-xs font-semibold text-[var(--accent-violet)] bg-[rgba(139,92,246,0.15)] px-2 py-0.5 rounded-full border border-[rgba(139,92,246,0.3)]">
                  WS
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] flex items-center justify-center border border-[var(--border-subtle)]">
                  <Code2 className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border",
                  route.method === 'GET' && "bg-[rgba(59,130,246,0.15)] text-[var(--accent-cyan)] border-[rgba(59,130,246,0.3)]",
                  route.method === 'POST' && "bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)] border-[rgba(16,185,129,0.3)]",
                  route.method === 'PUT' && "bg-[rgba(245,158,11,0.15)] text-[var(--accent-amber)] border-[rgba(245,158,11,0.3)]",
                  route.method === 'DELETE' && "bg-[rgba(244,63,94,0.15)] text-[var(--accent-rose)] border-[rgba(244,63,94,0.3)]",
                  route.method === 'PATCH' && "bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] border-[rgba(139,92,246,0.3)]",
                  !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method) && "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
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
              <div className="font-mono text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                {route.url}
              </div>
              {route.name && (
                <div className="text-xs text-[var(--text-secondary)] font-medium">
                  {route.name}
                </div>
              )}
            </div>

            {/* Route-specific info */}
            <div className="flex items-center gap-2 flex-wrap">
              {route.routeType === 'websocket' && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--accent-violet)]">
                    <div className="w-1.5 h-1.5 bg-[var(--accent-violet)] rounded-full"></div>
                    <span className="font-medium">
                      {(route.incomingRules?.length || 0) + (route.outgoingRules?.length || 0)} rules
                    </span>
                  </div>
                  {route.incomingRules?.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] rounded-full border border-[rgba(139,92,246,0.3)]">
                      {route.incomingRules.length} incoming
                    </span>
                  )}
                  {route.outgoingRules?.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] rounded-full border border-[rgba(139,92,246,0.3)]">
                      {route.outgoingRules.length} outgoing
                    </span>
                  )}
                </>
              )}

              {route.headersOnly && (
                <span className="text-xs px-2 py-1 bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)] rounded-full border border-[rgba(6,182,212,0.3)] font-medium">
                  <div className="flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    Headers-Only
                  </div>
                </span>
              )}

              {route.routeType !== 'websocket' && route.responseBody && (
                <span className="text-xs px-2 py-0.5 bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)] rounded-full border border-[rgba(16,185,129,0.3)]">
                  Custom Response
                </span>
              )}

              {route.routeType !== 'websocket' && route.modifyHeaders && Object.keys(route.modifyHeaders).length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-[rgba(249,115,22,0.15)] text-[var(--accent-orange)] rounded-full border border-[rgba(249,115,22,0.3)]">
                  {Object.keys(route.modifyHeaders).length} header{Object.keys(route.modifyHeaders).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex-shrink-0">
            <div className={cn(
              "w-2 h-2 rounded-full transition-colors",
              route.routeType === 'websocket' ? "bg-[var(--accent-violet)]" : "bg-[var(--accent-emerald)]"
            )} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoutePreview;
