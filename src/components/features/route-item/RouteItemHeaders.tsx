import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Shield } from 'lucide-react';
import HeaderDisplay from '@/components/common/HeaderDisplay';
import RemoveHeadersDisplay from '@/components/common/RemoveHeadersDisplayProps';
import type { RouteInfo } from '@/hooks/useRouteInfo';

interface RouteItemHeadersProps {
  info: RouteInfo;
}

const RouteItemHeaders: React.FC<RouteItemHeadersProps> = ({ info }) => (
  <div className="space-y-3">
    <div className="grid gap-3">
      {info.hasResponseHeaders && (
        <HeaderDisplay
          headers={info.httpConfig.responseHeaders || {}}
          title={info.isHeadersOnly ? 'Response Headers (Added to Real Response)' : 'Response Headers'}
          icon={<ArrowDownLeft size={14} className="text-[var(--accent-emerald)]" />}
          emptyMessage="No response headers configured"
        />
      )}
      {info.hasRequestHeaders && (
        <HeaderDisplay
          headers={info.httpConfig.requestHeaders || {}}
          title="Request Headers (Added to Outgoing Request)"
          icon={<ArrowUpRight size={14} className="text-[var(--accent-cyan)]" />}
          emptyMessage="No request headers configured"
        />
      )}
      {info.hasRemoveHeaders && (
        <RemoveHeadersDisplay
          removeHeaders={info.httpConfig.removeRequestHeaders || []}
          title="Remove Request Headers"
          icon={<Shield size={14} className="text-[var(--accent-rose)]" />}
        />
      )}
    </div>
  </div>
);

export default RouteItemHeaders;
