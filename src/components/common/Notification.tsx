import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X, Pause, Play, Clock } from 'lucide-react';
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
    bg: 'bg-ds-bg-elevated',
    border: 'border-l-4 border-l-ds-accent-emerald',
    icon: 'bg-ds-accent-emerald/15 text-ds-accent-emerald',
    title: 'text-ds-text-primary',
    message: 'text-ds-text-secondary',
    progress: 'bg-ds-accent-emerald'
  },
  error: {
    bg: 'bg-ds-bg-elevated',
    border: 'border-l-4 border-l-ds-accent-rose',
    icon: 'bg-ds-accent-rose/15 text-ds-accent-rose',
    title: 'text-ds-text-primary',
    message: 'text-ds-text-secondary',
    progress: 'bg-ds-accent-rose'
  },
  info: {
    bg: 'bg-ds-bg-elevated',
    border: 'border-l-4 border-l-ds-accent-cyan',
    icon: 'bg-ds-accent-cyan/15 text-ds-accent-cyan',
    title: 'text-ds-text-primary',
    message: 'text-ds-text-secondary',
    progress: 'bg-ds-accent-cyan'
  },
  warning: {
    bg: 'bg-ds-bg-elevated',
    border: 'border-l-4 border-l-ds-accent-amber',
    icon: 'bg-ds-accent-amber/15 text-ds-accent-amber',
    title: 'text-ds-text-primary',
    message: 'text-ds-text-secondary',
    progress: 'bg-ds-accent-amber'
  }
};

interface NotificationItemProps {
  notification: NotificationType;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(notification.duration || 3000);
  const [progress, setProgress] = useState(100);
  const [startTime] = useState(Date.now());

  const duration = notification.duration || 3000;
  const isAutoDismiss = !notification.persistent;

  useEffect(() => {
    if (!isAutoDismiss || isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progressPercent = Math.max(0, (remaining / duration) * 100);

      setRemainingTime(remaining);
      setProgress(progressPercent);

      if (remaining <= 0) {
        onRemove(notification.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification.id, duration, startTime, onRemove, isAutoDismiss, isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-ds-md shadow-ds-lg max-w-sm overflow-hidden border border-ds-border-subtle",
        colors.bg,
        colors.border,
        notification.persistent && "border-2 border-dashed border-ds-accent-amber/50"
      )}
    >
      {/* Progress bar */}
      {isAutoDismiss && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-ds-bg-surface">
          <motion.div
            className={cn("h-full transition-colors", colors.progress)}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      )}

      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center relative",
        colors.icon
      )}>
        <Icon className="w-4 h-4" />
        {/* Small dot indicator for persistent notifications */}
        {notification.persistent && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-ds-accent-amber rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium flex items-center gap-2", colors.title)}>
          {notification.title}
          {notification.persistent && (
            <span className="text-xs px-1.5 py-0.5 bg-ds-accent-amber/15 text-ds-accent-amber rounded-full">
              Persistent
            </span>
          )}
        </div>
        <div className={cn("text-sm mt-1", colors.message)}>
          {notification.message}
        </div>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 mt-2">
            {notification.actions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="text-xs px-2 py-1 bg-ds-bg-surface hover:bg-ds-bg-hover rounded-ds-sm text-ds-text-secondary transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1">
        {/* Timer and pause/resume for auto-dismiss notifications */}
        {isAutoDismiss && (
          <div className="flex items-center gap-1 text-xs text-ds-text-tertiary">
            <Clock className="w-3 h-3" />
            <span>{formatTime(remainingTime)}</span>
            <button
              onClick={togglePause}
              className="p-0.5 hover:bg-ds-bg-surface rounded-ds-sm transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <Play className="w-3 h-3" />
              ) : (
                <Pause className="w-3 h-3" />
              )}
            </button>
          </div>
        )}

        <button
          onClick={() => onRemove(notification.id)}
          className="p-1 text-ds-text-tertiary hover:text-ds-text-secondary hover:bg-ds-bg-surface rounded-ds-sm transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
