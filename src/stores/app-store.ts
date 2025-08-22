import { create } from 'zustand';
import { 
  AppState, 
  RouteConfig, 
  WebSocketConfig, 
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
  
  // Actions - Updated to handle both RouteConfig and WebSocketConfig
  setEnabled: (enabled: boolean) => void;
  setRoutes: (routes: Record<string, RouteConfig | WebSocketConfig>) => void;
  addRoute: (key: string, config: RouteConfig | WebSocketConfig) => void;
  removeRoute: (key: string) => void;
  updateRoute: (key: string, config: RouteConfig | WebSocketConfig) => void;
  toggleRoute: (key: string, enabled: boolean) => void;
  clearRoutes: () => void;
  
  // UI Actions
  setActiveTab: (tab: TabId) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setEditingRoute: (key: string | null) => void;
  
  // Notifications
  addNotification: (title: string, message: string, type?: NotificationType) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Helper methods for route type detection
  isWebSocketRoute: (key: string) => boolean;
  getHttpRoutes: () => Record<string, RouteConfig>;
  getWebSocketRoutes: () => Record<string, WebSocketConfig>;
  getRoutesByType: (type: 'http' | 'websocket' | 'all') => Record<string, RouteConfig | WebSocketConfig>;
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
  
  setRoutes: (routes) => set({ routes }),
  
  addRoute: (key, config) => set((state) => ({
    routes: { ...state.routes, [key]: config }
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
  addNotification: (title, message, type = 'info') => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        id: Math.random().toString(36).substring(2, 11),
        title,
        message,
        type,
        timestamp: Date.now()
      }
    ]
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  clearNotifications: () => set({ notifications: [] }),

  // Helper methods
  isWebSocketRoute: (key) => key.startsWith('WS:'),
  
  getHttpRoutes: () => {
    const state = get();
    const httpRoutes: Record<string, RouteConfig> = {};
    
    Object.entries(state.routes).forEach(([key, config]) => {
      if (!key.startsWith('WS:')) {
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
  
  getRoutesByType: (type) => {
    const state = get();
    
    if (type === 'http') {
      return state.getHttpRoutes();
    } else if (type === 'websocket') {
      return state.getWebSocketRoutes();
    } else {
      return state.routes; // Return all routes
    }
  }
}));