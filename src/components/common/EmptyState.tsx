import React from 'react';
import Button from '../ui/Button';
import { Plus, Route, Zap, Settings, MessageSquare } from 'lucide-react';

const EmptyState: React.FC<{ onAddRoute: () => void }> = ({ onAddRoute }) => {
  const features = [
    {
      icon: <Zap size={16} />,
      title: 'HTTP Interception',
      description: 'Capture & modify requests'
    },
    {
      icon: <Settings size={16} />,
      title: 'Header Modification',
      description: 'Custom headers & responses'
    },
    {
      icon: <MessageSquare size={16} />,
      title: 'WebSocket Support',
      description: 'Real-time message handling'
    }
  ];

  return (
    <div className="ds-empty-state">
      <div className="ds-empty-state-icon">
        <Route size={24} />
      </div>

      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
        No routes configured
      </h2>

      <p className="text-[12px] text-[var(--text-secondary)] mb-4 max-w-xs">
        Create your first route to start intercepting HTTP requests, headers, and WebSocket messages.
      </p>

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

      <Button
        variant="primary"
        onClick={onAddRoute}
        leftIcon={<Plus size={16} />}
      >
        Create Route
      </Button>
    </div>
  );
};

export default EmptyState;
