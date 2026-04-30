import React from 'react';
import Button from '../ui/Button';
import { Plus, Route, Zap, Settings, MessageSquare } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'default' | 'danger';
  };
  features?: Feature[];
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  features,
}) => (
  <div className="ds-empty-state">
    {icon && (
      <div className="ds-empty-state-icon">
        {icon}
      </div>
    )}

    <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
      {title}
    </h2>

    {description && (
      <p className="text-[12px] text-[var(--text-secondary)] mb-4 max-w-xs">
        {description}
      </p>
    )}

    {features && features.length > 0 && (
      <div className="grid grid-cols-3 gap-2 mb-4 w-full max-w-sm">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-center"
          >
            <div className="w-6 h-6 mx-auto mb-1.5 bg-[rgba(99,102,241,0.15)] rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--accent-indigo)]">
              {feature.icon}
            </div>
            <div className="text-[10px] font-medium text-[var(--text-primary)]">
              {feature.title}
            </div>
          </div>
        ))}
      </div>
    )}

    {action && (
      <Button
        variant={action.variant || 'primary'}
        onClick={action.onClick}
        leftIcon={action.icon}
      >
        {action.label}
      </Button>
    )}
  </div>
);

// Pre-configured empty state for "no routes"
export const RoutesEmptyState: React.FC<{ onAddRoute: () => void }> = ({ onAddRoute }) => (
  <EmptyState
    icon={<Route size={24} />}
    title="No routes configured"
    description="Create your first route to start intercepting HTTP requests, headers, and WebSocket messages."
    features={[
      { icon: <Zap size={16} />, title: 'HTTP Interception' },
      { icon: <Settings size={16} />, title: 'Header Modification' },
      { icon: <MessageSquare size={16} />, title: 'WebSocket Support' },
    ]}
    action={{
      label: 'Create Route',
      onClick: onAddRoute,
      icon: <Plus size={16} />,
    }}
  />
);

export default EmptyState;
