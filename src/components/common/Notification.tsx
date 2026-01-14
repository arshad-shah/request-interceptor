import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Notification as NotificationType } from '@/types';
import { cn } from '@/lib/utils';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle
};

const colorMap = {
  success: {
    border: 'border-l-[var(--accent-emerald)]',
    icon: 'text-[var(--accent-emerald)]'
  },
  error: {
    border: 'border-l-[var(--accent-rose)]',
    icon: 'text-[var(--accent-rose)]'
  },
  info: {
    border: 'border-l-[var(--accent-cyan)]',
    icon: 'text-[var(--accent-cyan)]'
  },
  warning: {
    border: 'border-l-[var(--accent-amber)]',
    icon: 'text-[var(--accent-amber)]'
  }
};

interface NotificationItemProps {
  notification: NotificationType;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  const [progress, setProgress] = useState(100);
  const [startTime] = useState(Date.now());

  const duration = notification.duration || 3000;
  const isAutoDismiss = !notification.persistent;

  useEffect(() => {
    if (!isAutoDismiss) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progressPercent = Math.max(0, (remaining / duration) * 100);

      setProgress(progressPercent);

      if (remaining <= 0) {
        onRemove(notification.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification.id, duration, startTime, onRemove, isAutoDismiss]);

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] border-l-4 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] max-w-sm overflow-hidden',
        colors.border
      )}
    >
      {/* Progress bar */}
      {isAutoDismiss && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--bg-surface)]">
          <div
            className="h-full bg-[var(--text-tertiary)] transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className={cn('flex-shrink-0', colors.icon)}>
        <Icon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)]">
          {notification.title}
        </div>
        <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
          {notification.message}
        </div>

        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 mt-2">
            {notification.actions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="ds-btn text-[11px] px-2 py-1"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(notification.id)}
        className="ds-icon-btn flex-shrink-0"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
