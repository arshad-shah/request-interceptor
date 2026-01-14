import { ReactNode } from 'react';

interface RouteItemStatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'gray' | 'red';
}

export const RouteItemStatCard = ({
  label,
  value,
  icon,
  variant = 'compact',
  className = '',
  color = 'gray'
}: RouteItemStatCardProps) => {
  const isCompact = variant === 'compact';

  const colorClasses = {
    blue: 'border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.1)]',
    green: 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)]',
    orange: 'border-[rgba(249,115,22,0.3)] bg-[rgba(249,115,22,0.1)]',
    purple: 'border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.1)]',
    gray: 'border-[var(--border-subtle)] bg-[var(--bg-surface)]',
    red: 'border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.1)]'
  };

  return (
    <div className={`
      rounded-[var(--radius-lg)] border transition-all duration-300 hover:border-[var(--border-default)]
      ${colorClasses[color]}
      ${isCompact ? 'p-3' : 'p-4'}
      ${className}
    `}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide truncate">
          {label}
        </span>
        {icon && (
          <span className="text-[var(--text-tertiary)] flex-shrink-0 ml-2">
            {icon}
          </span>
        )}
      </div>
      <div className="text-sm font-bold text-[var(--text-primary)] truncate">
        {value}
      </div>
    </div>
  );
};

// Custom Type Display Component
const TypeDisplay = ({ headersOnly, isWebSocket, ruleCount }: {
  headersOnly: boolean;
  isWebSocket: boolean;
  ruleCount: number;
}) => {
  if (isWebSocket) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[var(--accent-violet)] rounded-full animate-pulse"></div>
        <span className="text-[var(--accent-violet)] font-medium">WebSocket</span>
      </div>
    );
  }

  if (headersOnly) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full"></div>
        <span className="text-[var(--accent-cyan)] font-medium">Headers Only</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-[var(--accent-emerald)] rounded-full"></div>
      <span className="text-[var(--accent-emerald)] font-medium">HTTP</span>
      {ruleCount > 0 && (
        <span className="text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
          {ruleCount} rules
        </span>
      )}
    </div>
  );
};

// Custom Status Display Component
const StatusDisplay = ({ status }: { status: number }) => {
  const getStatusInfo = (status: number) => {
    if (status >= 200 && status < 300) {
      return { label: 'Success', bgColor: 'bg-[rgba(16,185,129,0.15)]', textColor: 'text-[var(--accent-emerald)]' };
    } else if (status >= 300 && status < 400) {
      return { label: 'Redirect', bgColor: 'bg-[rgba(59,130,246,0.15)]', textColor: 'text-[var(--accent-cyan)]' };
    } else if (status >= 400 && status < 500) {
      return { label: 'Client Error', bgColor: 'bg-[rgba(249,115,22,0.15)]', textColor: 'text-[var(--accent-orange)]' };
    } else if (status >= 500) {
      return { label: 'Server Error', bgColor: 'bg-[rgba(244,63,94,0.15)]', textColor: 'text-[var(--accent-rose)]' };
    }
    return { label: 'Unknown', bgColor: 'bg-[var(--bg-elevated)]', textColor: 'text-[var(--text-secondary)]' };
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-xs font-semibold rounded-[var(--radius-sm)] ${statusInfo.bgColor} ${statusInfo.textColor}`}>
        {status}
      </span>
      <span className="text-xs text-[var(--text-tertiary)]">{statusInfo.label}</span>
    </div>
  );
};

interface RouteStatsGridProps {
  isHeadersOnly: boolean;
  isWebSocket: boolean;
  totalRules: number;
  httpConfig: { status: number };
  config: { delay?: number };
  contentTypeName: string;
  timestamp: string;
}

export const RouteStatsGrid = ({
  isHeadersOnly,
  isWebSocket,
  totalRules,
  httpConfig,
  config,
  contentTypeName,
  timestamp
}: RouteStatsGridProps) => {
  const getTypeColor = () => {
    if (isWebSocket) return 'purple';
    if (isHeadersOnly) return 'blue';
    return 'green';
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'green';
    if (status >= 300 && status < 400) return 'blue';
    if (status >= 400 && status < 500) return 'orange';
    if (status >= 500) return 'red';
    return 'gray';
  };

  const stats = [
    {
      label: 'Type',
      value: <TypeDisplay headersOnly={isHeadersOnly} isWebSocket={isWebSocket} ruleCount={totalRules} />,
      color: getTypeColor(),
      show: true
    },
    {
      label: 'Status',
      value: <StatusDisplay status={httpConfig.status} />,
      color: getStatusColor(httpConfig.status),
      show: !isWebSocket && !isHeadersOnly
    },
    {
      label: 'Delay',
      value: (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.delay && config.delay > 0 ? 'bg-[var(--accent-orange)]' : 'bg-[var(--text-tertiary)]'}`}></div>
          <span className="font-mono">{config.delay ?? 0}ms</span>
        </div>
      ),
      color: (config.delay && config.delay > 0) ? 'orange' : 'gray',
      show: true
    },
    {
      label: 'Content Type',
      value: (
        <span className="text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-1 rounded-[var(--radius-sm)] font-mono">
          {contentTypeName}
        </span>
      ),
      color: 'gray',
      show: !isWebSocket && !isHeadersOnly
    },
    {
      label: 'Created',
      value: (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">{timestamp}</span>
        </div>
      ),
      color: 'gray',
      show: true
    }
  ].filter(stat => stat.show);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <RouteItemStatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          color={stat.color as any}
          variant="compact"
        />
      ))}
    </div>
  );
};

export default RouteStatsGrid;
