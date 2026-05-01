import React from 'react';
import { MessageSquare, Filter, Code2, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoutePreviewProps {
  routes: any[];
}

const RoutePreview: React.FC<RoutePreviewProps> = ({ routes }) => {
  return (
    <div className="space-y-3 max-h-80 overflow-auto scrollable-content p-4">
      {routes.map((route, index) => {
        const isWS = route.routeType === 'websocket';
        const isInj = route.routeType === 'injection';
        const isHttp = !isWS && !isInj;
        const displayUrl = isInj ? (route.urlPattern || route.url) : route.url;

        const scriptCount = isInj && Array.isArray(route.scripts)
          ? route.scripts.filter((s: string) => s && s.trim()).length
          : 0;
        const styleCount = isInj && Array.isArray(route.stylesheets)
          ? route.stylesheets.filter((s: string) => s && s.trim()).length
          : 0;

        const httpModeMeta = isHttp && route.interceptionMode && route.interceptionMode !== 'mock'
          ? (() => {
              switch (route.interceptionMode) {
                case 'block':
                  return { label: 'Block', tone: 'rose' as const };
                case 'redirect':
                  return { label: 'Redirect', tone: 'amber' as const };
                case 'passthrough':
                  return { label: 'Passthrough', tone: 'cyan' as const };
                default:
                  return null;
              }
            })()
          : null;

        return (
          <div
            key={route.id || index}
            className={cn(
              "group relative flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border transition-all duration-200",
              isWS && "bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.3)] hover:border-[var(--accent-violet)]",
              isInj && "bg-[rgba(99,102,241,0.1)] border-[rgba(99,102,241,0.3)] hover:border-[var(--accent-indigo)]",
              isHttp && "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
            )}
          >
            {/* Route type indicator */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {isWS && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-[rgba(139,92,246,0.15)] rounded-[var(--radius-md)] flex items-center justify-center border border-[rgba(139,92,246,0.3)]">
                    <MessageSquare className="w-5 h-5 text-[var(--accent-violet)]" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent-violet)] bg-[rgba(139,92,246,0.15)] px-2 py-0.5 rounded-full border border-[rgba(139,92,246,0.3)]">
                    WS
                  </span>
                </div>
              )}

              {isInj && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-[rgba(99,102,241,0.15)] rounded-[var(--radius-md)] flex items-center justify-center border border-[rgba(99,102,241,0.3)]">
                    <FileCode className="w-5 h-5 text-[var(--accent-indigo)]" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent-indigo)] bg-[rgba(99,102,241,0.15)] px-2 py-0.5 rounded-full border border-[rgba(99,102,241,0.3)]">
                    INJ
                  </span>
                </div>
              )}

              {isHttp && (
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
              <div>
                <div className="font-mono text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                  {displayUrl}
                </div>
                {route.name && (
                  <div className="text-xs text-[var(--text-secondary)] font-medium">
                    {route.name}
                  </div>
                )}
              </div>

              {/* Route-specific info */}
              <div className="flex items-center gap-2 flex-wrap">
                {isWS && (
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

                {isInj && (
                  <>
                    <span className="text-xs px-2 py-0.5 bg-[rgba(99,102,241,0.15)] text-[var(--accent-indigo)] rounded-full border border-[rgba(99,102,241,0.3)] font-medium">
                      {route.injectAt === 'document_start' ? 'document_start' : 'document_end'}
                    </span>
                    {scriptCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-[rgba(99,102,241,0.15)] text-[var(--accent-indigo)] rounded-full border border-[rgba(99,102,241,0.3)]">
                        {scriptCount} script{scriptCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {styleCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-[rgba(99,102,241,0.15)] text-[var(--accent-indigo)] rounded-full border border-[rgba(99,102,241,0.3)]">
                        {styleCount} style{styleCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                )}

                {isHttp && httpModeMeta && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    httpModeMeta.tone === 'rose' && "bg-[rgba(244,63,94,0.15)] text-[var(--accent-rose)] border-[rgba(244,63,94,0.3)]",
                    httpModeMeta.tone === 'amber' && "bg-[rgba(245,158,11,0.15)] text-[var(--accent-amber)] border-[rgba(245,158,11,0.3)]",
                    httpModeMeta.tone === 'cyan' && "bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)] border-[rgba(6,182,212,0.3)]"
                  )}>
                    {httpModeMeta.label}
                  </span>
                )}

                {isHttp && route.interceptionMode === 'redirect' && route.redirectUrl && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-full border border-[var(--border-subtle)] font-mono truncate max-w-[240px]">
                    → {route.redirectUrl}
                  </span>
                )}

                {isHttp && route.headersOnly && route.interceptionMode !== 'passthrough' && (
                  <span className="text-xs px-2 py-1 bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)] rounded-full border border-[rgba(6,182,212,0.3)] font-medium">
                    <div className="flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Headers-Only
                    </div>
                  </span>
                )}

                {isHttp && route.graphqlOperationName && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-full border border-[var(--border-subtle)] font-mono">
                    GQL: {route.graphqlOperationName}
                  </span>
                )}

                {isHttp && Array.isArray(route.queryParamRules) && route.queryParamRules.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-full border border-[var(--border-subtle)]">
                    {route.queryParamRules.length} param rule{route.queryParamRules.length !== 1 ? 's' : ''}
                  </span>
                )}

                {isHttp && route.responseHeaders && Object.keys(route.responseHeaders).length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-[rgba(249,115,22,0.15)] text-[var(--accent-orange)] rounded-full border border-[rgba(249,115,22,0.3)]">
                    {Object.keys(route.responseHeaders).length} response header{Object.keys(route.responseHeaders).length !== 1 ? 's' : ''}
                  </span>
                )}

                {isHttp && route.requestHeaders && Object.keys(route.requestHeaders).length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-[rgba(249,115,22,0.15)] text-[var(--accent-orange)] rounded-full border border-[rgba(249,115,22,0.3)]">
                    {Object.keys(route.requestHeaders).length} request header{Object.keys(route.requestHeaders).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isWS && "bg-[var(--accent-violet)]",
                isInj && "bg-[var(--accent-indigo)]",
                isHttp && "bg-[var(--accent-emerald)]"
              )} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RoutePreview;
