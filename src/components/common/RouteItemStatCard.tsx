import { motion } from 'framer-motion';
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
    blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white',
    green: 'border-green-200 bg-gradient-to-br from-green-50 to-white',
    orange: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white',
    purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-white',
    gray: 'border-gray-200 bg-gradient-to-br from-gray-50 to-white',
    red: 'border-red-200 bg-gradient-to-br from-red-50 to-white'
  };
  
  return (
    <div className={`
      rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5
      ${colorClasses[color]}
      ${isCompact ? 'p-3' : 'p-4'}
      ${className}
    `}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </span>
        {icon && (
          <span className="text-gray-400 flex-shrink-0 ml-2">
            {icon}
          </span>
        )}
      </div>
      <div className="text-sm font-bold text-gray-900 truncate">
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
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
        <span className="text-purple-700 font-medium">WebSocket</span>
      </div>
    );
  }
  
  if (headersOnly) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-blue-700 font-medium">Headers Only</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-green-700 font-medium">HTTP</span>
      {ruleCount > 0 && (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
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
      return { color: 'green', label: 'Success', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    } else if (status >= 300 && status < 400) {
      return { color: 'blue', label: 'Redirect', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    } else if (status >= 400 && status < 500) {
      return { color: 'orange', label: 'Client Error', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
    } else if (status >= 500) {
      return { color: 'red', label: 'Server Error', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    }
    return { color: 'gray', label: 'Unknown', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  };

  const statusInfo = getStatusInfo(status);
  
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${statusInfo.bgColor} ${statusInfo.textColor}`}>
        {status}
      </span>
      <span className="text-xs text-gray-600">{statusInfo.label}</span>
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
          <div className={`w-2 h-2 rounded-full ${config.delay && config.delay > 0 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
          <span className="font-mono">{config.delay ?? 0}ms</span>
        </div>
      ),
      color: (config.delay && config.delay > 0) ? 'orange' : 'gray',
      show: true
    },
    {
      label: 'Content Type',
      value: (
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-mono">
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
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <motion.div 
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <RouteItemStatCard
            label={stat.label}
            value={stat.value}
            color={stat.color as any}
            variant="compact"
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default RouteStatsGrid;