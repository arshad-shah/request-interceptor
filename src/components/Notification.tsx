import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    bg: 'bg-white',
    border: 'border-l-4 border-l-green-500',
    icon: 'bg-green-50 text-green-500',
    title: 'text-gray-900',
    message: 'text-gray-600'
  },
  error: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-red-500',
    icon: 'bg-red-50 text-red-500',
    title: 'text-gray-900',
    message: 'text-gray-600'
  },
  info: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-blue-500',
    icon: 'bg-blue-50 text-blue-500',
    title: 'text-gray-900',
    message: 'text-gray-600'
  },
  warning: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-amber-500',
    icon: 'bg-amber-50 text-amber-500',
    title: 'text-gray-900',
    message: 'text-gray-600'
  }
};

interface NotificationItemProps {
  notification: NotificationType;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg shadow-lg max-w-sm",
        colors.bg,
        colors.border
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
        colors.icon
      )}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", colors.title)}>
          {notification.title}
        </div>
        <div className={cn("text-sm mt-1", colors.message)}>
          {notification.message}
        </div>
      </div>
      
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
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