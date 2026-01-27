import { create } from 'zustand';
import {
  AppState,
  RouteConfig,
  WebSocketConfig,
  InjectionConfig,
  Notification,
  FilterState,
  TabId,
  NotificationType
} from '@/types';

interface AppStore extends AppState {
  // State
  activeTab: TabId;
  notifications: Notification[];
  filters: FilterState;
  editingRoute: string | null;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setRoutes: (routes: Record<string, RouteConfig | WebSocketConfig | InjectionConfig>) => void;
  addRoute: (key: string, config: RouteConfig | WebSocketConfig | InjectionConfig) => void;
  removeRoute: (key: string) => void;
  updateRoute: (key: string, config: RouteConfig | WebSocketConfig | InjectionConfig) => void;
  toggleRoute: (key: string, enabled: boolean) => void;
  clearRoutes: () => void;
  
  // UI Actions
  setActiveTab: (tab: TabId) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setEditingRoute: (key: string | null) => void;
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Helper methods for route type detection
  isWebSocketRoute: (key: string) => boolean;
  isInjectionRoute: (key: string) => boolean;
  getHttpRoutes: () => Record<string, RouteConfig>;
  getWebSocketRoutes: () => Record<string, WebSocketConfig>;
  getInjectionRoutes: () => Record<string, InjectionConfig>;
  getRoutesByType: (type: 'http' | 'websocket' | 'injection' | 'all') => Record<string, RouteConfig | WebSocketConfig | InjectionConfig>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  enabled: false,
  routes: {},
  activeTab: 'routes',
  notifications: [],
  filters: {
    search: '',
    method: 'all',
    routeType: 'all' // Added route type filter
  },
  editingRoute: null,

  // Actions
  setEnabled: (enabled) => set({ enabled }),
  
  setRoutes: (routes) => {
    const routesWithEnabled = Object.entries(routes).reduce((acc, [key, config]) => {
      acc[key] = { ...config, enabled: config.enabled ?? true };
      return acc;
    }, {} as Record<string, RouteConfig | WebSocketConfig | InjectionConfig>);
    set({ routes: routesWithEnabled });
  },
  
  addRoute: (key, config) => set((state) => ({
    routes: { ...state.routes, [key]: { ...config, enabled: config.enabled ?? true } }
  })),
  
  removeRoute: (key) => set((state) => {
    const newRoutes = { ...state.routes };
    delete newRoutes[key];
    return { routes: newRoutes };
  }),
  
  updateRoute: (key, config) => set((state) => ({
    routes: { ...state.routes, [key]: config }
  })),
  
  // Fixed toggleRoute to properly update the state for both route types
  toggleRoute: (key, enabled) => set((state) => {
    const currentConfig = state.routes[key];
    if (!currentConfig) return state; // Route doesn't exist
    
    return {
      routes: {
        ...state.routes,
        [key]: {
          ...currentConfig,
          enabled: enabled
        }
      }
    };
  }),
  
  clearRoutes: () => set({ routes: {} }),
  
  // UI Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  
  setEditingRoute: (key) => set({ editingRoute: key }),
  
  // Notifications
  addNotification: (notification) => {
    // Generate UUID-like ID with timestamp and randomness
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const id = `${timestamp}-${randomPart}`;
    
    // Check for duplicates within the last 2 seconds to avoid spam
    const now = Date.now();
    const recentNotifications = get().notifications.filter(
      n => n.timestamp && (now - n.timestamp) < 2000
    );
    
    const isDuplicate = recentNotifications.some(
      n => n.title === notification.title && 
           n.message === notification.message && 
           n.type === notification.type
    );
    
    if (isDuplicate) {
      return; // Skip duplicate notification
    }
    
    // Set duration based on notification type if not specified
    let duration = notification.duration;
    if (!duration && !notification.persistent) {
      switch (notification.type) {
        case 'error':
          duration = 6000; // 6 seconds for errors
          break;
        case 'warning':
          duration = 4500; // 4.5 seconds for warnings
          break;
        case 'success':
          duration = 3000; // 3 seconds for success
          break;
        case 'info':
        default:
          duration = 3500; // 3.5 seconds for info
          break;
      }
    }
    
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: now,
      duration
    };
    
    set((state) => {
      // Limit to last 10 notifications to prevent memory bloat
      const updatedNotifications = [...state.notifications, newNotification];
      if (updatedNotifications.length > 10) {
        return {
          notifications: updatedNotifications.slice(-10)
        };
      }
      return {
        notifications: updatedNotifications
      };
    });
  },
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  clearNotifications: () => set({ notifications: [] }),

  // Helper methods — delegate to core
  isWebSocketRoute: (key) => key.startsWith('WS:'),
  isInjectionRoute: (key) => key.startsWith('INJ:'),

  getHttpRoutes: () => {
    const state = get();
    const httpRoutes: Record<string, RouteConfig> = {};

    Object.entries(state.routes).forEach(([key, config]) => {
      if (!key.startsWith('WS:') && !key.startsWith('INJ:')) {
        httpRoutes[key] = config as RouteConfig;
      }
    });

    return httpRoutes;
  },

  getWebSocketRoutes: () => {
    const state = get();
    const wsRoutes: Record<string, WebSocketConfig> = {};

    Object.entries(state.routes).forEach(([key, config]) => {
      if (key.startsWith('WS:')) {
        wsRoutes[key] = config as WebSocketConfig;
      }
    });

    return wsRoutes;
  },

  getInjectionRoutes: () => {
    const state = get();
    const injRoutes: Record<string, InjectionConfig> = {};

    Object.entries(state.routes).forEach(([key, config]) => {
      if (key.startsWith('INJ:')) {
        injRoutes[key] = config as InjectionConfig;
      }
    });

    return injRoutes;
  },

  getRoutesByType: (type) => {
    const state = get();

    if (type === 'http') {
      return state.getHttpRoutes();
    } else if (type === 'websocket') {
      return state.getWebSocketRoutes();
    } else if (type === 'injection') {
      return state.getInjectionRoutes();
    } else {
      return state.routes;
    }
  }
}));