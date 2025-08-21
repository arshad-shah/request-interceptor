import { create } from 'zustand';
import { AppState, RouteConfig, Notification, FilterState, TabId, NotificationType } from '@/types';

interface AppStore extends AppState {
  // State
  activeTab: TabId;
  notifications: Notification[];
  filters: FilterState;
  editingRoute: string | null;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setRoutes: (routes: Record<string, RouteConfig>) => void;
  addRoute: (key: string, config: RouteConfig) => void;
  removeRoute: (key: string) => void;
  updateRoute: (key: string, config: RouteConfig) => void;
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
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  enabled: false,
  routes: {},
  activeTab: 'routes',
  notifications: [],
  filters: {
    search: '',
    method: 'all'
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
  
  // Fixed toggleRoute to properly update the state
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
  
  clearNotifications: () => set({ notifications: [] })
}));