import React from 'react';
import type { RouteInfo } from '@/hooks/useRouteInfo';
import RouteStatsGrid from '@/components/common/RouteItemStatCard';

interface RouteItemDetailsProps {
  info: RouteInfo;
}

const RouteItemDetails: React.FC<RouteItemDetailsProps> = ({ info }) => (
  <div className="space-y-3">
    {/* Description */}
    <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
      <p className="text-[12px] text-[var(--text-secondary)]">
        {info.description}
        {info.isHttp && info.interceptionMode === 'block' && (
          <span className="ml-1 text-[var(--accent-rose)]">(Request blocked)</span>
        )}
        {info.isHttp && info.interceptionMode === 'redirect' && (
          <span className="ml-1 text-[var(--accent-amber)]">
            → {info.httpConfig.redirectUrl}
          </span>
        )}
        {info.isHeadersOnly && (
          <span className="ml-1 text-[var(--accent-cyan)]">
            (Headers only, original response preserved)
          </span>
        )}
        {info.isWebSocket && (
          <span className="ml-1 text-[var(--accent-violet)]">
            (Real-time message processing)
          </span>
        )}
        {info.isInjection && (
          <span className="ml-1 text-[var(--accent-indigo)]">
            (Inject at {info.injConfig.injectAt === 'document_start' ? 'document start' : 'document end'})
          </span>
        )}
      </p>
    </div>

    {/* Stats Grid */}
    {!info.isInjection && (
      <RouteStatsGrid
        isHeadersOnly={info.isHeadersOnly}
        isWebSocket={info.isWebSocket}
        totalRules={info.totalRules}
        httpConfig={info.httpConfig}
        config={info.httpConfig as any}
        contentTypeName={info.contentTypeName}
        timestamp={info.timestamp}
      />
    )}
  </div>
);

export default RouteItemDetails;
