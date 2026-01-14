/**
 * NetworkStats Component
 * Displays statistics bar with request count, transfer size, and timing
 */

import { useNetworkStats } from '../../stores/network-store';
import { formatSize, formatTime } from '../../lib/network-api';
export function NetworkStats() {
  const stats = useNetworkStats();

  return (
    <div className="flex gap-2 p-3 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
      <div className="ds-stat-card compact flex-1">
        <span className="ds-stat-value">{stats.requestCount}</span>
        <span className="ds-stat-label">Requests</span>
      </div>
      <div className="ds-stat-card compact flex-1">
        <span className="ds-stat-value">{formatSize(stats.transferSize)}</span>
        <span className="ds-stat-label">Transferred</span>
      </div>
      <div className="ds-stat-card compact flex-1">
        <span className="ds-stat-value">{formatTime(stats.totalTime)}</span>
        <span className="ds-stat-label">Load Time</span>
      </div>
      <div className="ds-stat-card compact flex-1">
        <span className="ds-stat-value">
          {stats.domLoaded ? formatTime(stats.domLoaded) : '-'}
        </span>
        <span className="ds-stat-label">DOM Ready</span>
      </div>
    </div>
  );
}

export default NetworkStats;
