import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { RouteConfig, WebSocketConfig, InjectionConfig } from '@/types';
import { useRouteInfo } from '@/hooks/useRouteInfo';
import RouteItemHeader from './route-item/RouteItemHeader';
import RouteItemDetails from './route-item/RouteItemDetails';
import RouteItemWebSocketRules from './route-item/RouteItemWebSocketRules';
import RouteItemHeaders from './route-item/RouteItemHeaders';
import RouteItemResponsePreview from './route-item/RouteItemResponsePreview';
import RouteItemActions from './route-item/RouteItemActions';

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
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const info = useRouteInfo(routeKey, config);

  const getBorderColor = () => {
    if (info.isWebSocket) return 'border-l-[var(--accent-violet)]';
    if (info.isInjection) return 'border-l-[var(--accent-indigo)]';
    if (info.interceptionMode === 'block') return 'border-l-[var(--accent-rose)]';
    if (info.interceptionMode === 'redirect') return 'border-l-[var(--accent-amber)]';
    if (info.interceptionMode === 'passthrough') return 'border-l-[var(--accent-cyan)]';
    return 'border-l-[var(--accent-emerald)]';
  };

  const showResponsePreview =
    info.isHttp &&
    info.interceptionMode !== 'block' &&
    (!info.isHeadersOnly || (info.httpConfig.response && String(info.httpConfig.response).trim()));

  return (
    <div
      className={cn(
        'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] border-l-4 rounded-[var(--radius-md)] overflow-hidden',
        getBorderColor(),
        !info.isEnabled && 'opacity-60'
      )}
    >
      <RouteItemHeader
        info={info}
        isExpanded={isExpanded}
        onToggle={(enabled) => onToggle(routeKey, enabled)}
        onExpandToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div className="p-3 space-y-3">
            <RouteItemDetails info={info} />

            {info.isWebSocket && <RouteItemWebSocketRules info={info} />}

            {info.isHttp && info.hasAnyHeaders && <RouteItemHeaders info={info} />}

            {showResponsePreview && (
              <RouteItemResponsePreview
                info={info}
                isResponseExpanded={isResponseExpanded}
                onToggleExpand={() => setIsResponseExpanded(!isResponseExpanded)}
              />
            )}

            <RouteItemActions
              onEdit={() => onEdit(routeKey)}
              onDelete={() => onDelete(routeKey)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteItem;
