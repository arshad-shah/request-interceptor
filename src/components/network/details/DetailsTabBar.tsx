/**
 * Details panel tab bar with per-tab badges
 */

import { clsx } from 'clsx';
import { Search, Sparkles } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import type { ExtendedDetailTab } from '../utils';
import type { InsightCounts } from './types';

interface DetailsTabBarProps {
  request: NetworkRequest;
  cookieCount: number;
  insightCounts: InsightCounts;
  activeTab: ExtendedDetailTab;
  setActiveTab: (tab: ExtendedDetailTab) => void;
  onOpenSearch: () => void;
}

export function DetailsTabBar({
  request,
  cookieCount,
  insightCounts,
  activeTab,
  setActiveTab,
  onOpenSearch,
}: DetailsTabBarProps) {
  const wsFrameCount = request.wsFrames?.length || 0;
  
  const isWebSocket = request.type === 'websocket';
  
  const tabs: Array<{
    id: ExtendedDetailTab;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
    badgeType?: 'default' | 'warning' | 'error';
  }> = [
    { id: 'headers', label: 'Headers' },
    // For WebSocket: show Messages tab; For HTTP: show Payload tab
    ...(isWebSocket ? [{
      id: 'messages' as ExtendedDetailTab,
      label: 'Messages',
      badge: wsFrameCount > 0 ? wsFrameCount : undefined,
    }] : [{ id: 'payload' as ExtendedDetailTab, label: 'Payload' }]),
    // Hide Response tab for WebSocket requests
    ...(!isWebSocket ? [{ id: 'response' as ExtendedDetailTab, label: 'Response' }] : []),
    { id: 'timing', label: 'Timing' },
    {
      id: 'cookies',
      label: 'Cookies',
      badge: cookieCount > 0 ? cookieCount : undefined,
    },
    { id: 'initiator', label: 'Initiator' },
    {
      id: 'insights',
      label: 'Insights',
      icon: <Sparkles size={12} />,
      badge: insightCounts.errors > 0
        ? insightCounts.errors
        : insightCounts.warnings > 0
        ? insightCounts.warnings
        : insightCounts.total > 0
        ? insightCounts.total
        : undefined,
      badgeType: insightCounts.errors > 0
        ? 'error'
        : insightCounts.warnings > 0
        ? 'warning'
        : 'default',
    },
  ];

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-base)] border-b border-[var(--border-subtle)] overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={clsx(
            'ds-tab flex items-center gap-1.5 whitespace-nowrap',
            activeTab === tab.id && 'active'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span
              className={clsx(
                'ds-badge text-[9px]',
                tab.badgeType === 'error' && 'rose',
                tab.badgeType === 'warning' && 'amber',
                (!tab.badgeType || tab.badgeType === 'default') && 'gray'
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}

      {/* Search toggle */}
      <button
        onClick={onOpenSearch}
        className="ds-icon-btn ml-auto"
        title="Search (⌘F)"
      >
        <Search size={14} />
      </button>
    </div>
  );
}
