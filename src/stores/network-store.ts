/**
 * Network Store
 * Zustand store for managing network monitoring state
 */

import { create } from 'zustand';
import type {
  NetworkStore,
  NetworkRequest,
  NetworkFilters,
  NetworkSettings,
  NetworkFilterType,
  ResponseBody,
} from '../types/network';

const DEFAULT_FILTERS: NetworkFilters = {
  type: 'all',
  search: '',
};

const DEFAULT_SETTINGS: NetworkSettings = {
  preserveLog: false,
  recording: true,
  disableCache: false,
  showWaterfall: true,
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  // ============================================
  // Initial State
  // ============================================
  requests: [],
  selectedRequest: null,
  responseBody: null,
  filters: DEFAULT_FILTERS,
  settings: DEFAULT_SETTINGS,
  isRecording: true,
  debuggerAttached: false,
  stats: {
    requestCount: 0,
    transferSize: 0,
    totalTime: 0,
  },
  startTime: null,
  maxTime: 0,

  // ============================================
  // Request Management
  // ============================================
  setRequests: (requests: NetworkRequest[]) => {
    set((state) => {
      // Sync selected request with updated data if it exists in the new list
      let selectedRequest = state.selectedRequest;
      if (selectedRequest) {
        const updatedSelected = requests.find(
          (r) => r.requestId === selectedRequest!.requestId
        );
        if (updatedSelected) {
          selectedRequest = updatedSelected;
        }
      }
      return { requests, selectedRequest };
    });
    get().updateStats();
  },

  addRequest: (request: NetworkRequest) => {
    set((state) => {
      const existingIndex = state.requests.findIndex(
        (r) => r.requestId === request.requestId
      );

      let newRequests: NetworkRequest[];
      if (existingIndex >= 0) {
        // Update existing request
        newRequests = [...state.requests];
        newRequests[existingIndex] = {
          ...newRequests[existingIndex],
          ...request,
        };
      } else {
        // Add new request
        newRequests = [...state.requests, request];
      }

      // Limit to 500 requests
      if (newRequests.length > 500) {
        newRequests = newRequests.slice(-500);
      }

      // Sync selected request if it's the one being updated
      const selectedRequest =
        state.selectedRequest?.requestId === request.requestId
          ? { ...state.selectedRequest, ...request }
          : state.selectedRequest;

      return { requests: newRequests, selectedRequest };
    });
    get().updateStats();
  },

  updateRequest: (requestId: string, data: Partial<NetworkRequest>) => {
    set((state) => {
      const index = state.requests.findIndex((r) => r.requestId === requestId);
      if (index === -1) return state;

      const newRequests = [...state.requests];
      newRequests[index] = { ...newRequests[index], ...data };

      // Also update selected request if it's the same one
      const selectedRequest =
        state.selectedRequest?.requestId === requestId
          ? { ...state.selectedRequest, ...data }
          : state.selectedRequest;

      return { requests: newRequests, selectedRequest };
    });
    get().updateStats();
  },

  clearRequests: () => {
    set({
      requests: [],
      selectedRequest: null,
      responseBody: null,
      startTime: null,
      maxTime: 0,
      stats: {
        requestCount: 0,
        transferSize: 0,
        totalTime: 0,
      },
    });
  },

  // ============================================
  // Selection
  // ============================================
  selectRequest: (request: NetworkRequest | null) => {
    set({ selectedRequest: request, responseBody: null });
  },

  setResponseBody: (body: ResponseBody | null) => {
    set({ responseBody: body });
  },

  // ============================================
  // Filters
  // ============================================
  setFilter: (type: NetworkFilterType) => {
    set((state) => ({
      filters: { ...state.filters, type },
    }));
  },

  setSearch: (search: string) => {
    set((state) => ({
      filters: { ...state.filters, search },
    }));
  },

  clearFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  // ============================================
  // Settings
  // ============================================
  updateSettings: (settings: Partial<NetworkSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));
  },

  toggleRecording: () => {
    set((state) => ({
      isRecording: !state.isRecording,
      settings: { ...state.settings, recording: !state.isRecording },
    }));
  },

  // ============================================
  // Debugger
  // ============================================
  setDebuggerAttached: (attached: boolean) => {
    set({ debuggerAttached: attached });
  },

  // ============================================
  // Stats
  // ============================================
  updateStats: () => {
    const { requests } = get();

    if (requests.length === 0) {
      set({
        stats: { requestCount: 0, transferSize: 0, totalTime: 0 },
        startTime: null,
        maxTime: 0,
      });
      return;
    }

    // Calculate stats
    const requestCount = requests.length;
    const transferSize = requests.reduce(
      (sum, r) => sum + (r.encodedSize || r.size || 0),
      0
    );

    // Calculate timing
    const startTime = Math.min(...requests.map((r) => r.startTime));
    const maxDuration = Math.max(...requests.map((r) => r.duration || 0));

    const completedRequests = requests.filter(
      (r) => r.status === 'complete' || r.status === 'error'
    );
    let totalTime = 0;
    if (completedRequests.length > 0) {
      const maxEndTime = Math.max(
        ...completedRequests.map(
          (r) =>
            r.timing?.responseEnd || r.startTime + (r.duration || 0)
        )
      );
      totalTime = maxEndTime - startTime;
    }

    set({
      stats: { requestCount, transferSize, totalTime },
      startTime,
      maxTime: maxDuration,
    });
  },

  // ============================================
  // Computed
  // ============================================
  getFilteredRequests: () => {
    const { requests, filters } = get();

    return requests.filter((req) => {
      // Type filter
      if (filters.type !== 'all') {
        // Map fetch to xhr for filtering purposes
        const requestType = req.type === 'fetch' ? 'xhr' : req.type;
        if (requestType !== filters.type) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const searchStr = [
          req.url,
          req.method,
          req.statusCode?.toString() || '',
          req.mimeType || '',
          req.hostname || '',
        ]
          .join(' ')
          .toLowerCase();

        if (!searchStr.includes(query)) {
          return false;
        }
      }

      // Status code filter
      if (filters.statusCode) {
        if (req.statusCode !== filters.statusCode) {
          return false;
        }
      }

      // Method filter
      if (filters.method) {
        if (req.method !== filters.method) {
          return false;
        }
      }

      return true;
    });
  },
}));

// ============================================
// Selector hooks for performance
// ============================================

export const useNetworkRequests = () =>
  useNetworkStore((state) => state.requests);

export const useFilteredNetworkRequests = () =>
  useNetworkStore((state) => state.getFilteredRequests());

export const useSelectedRequest = () =>
  useNetworkStore((state) => state.selectedRequest);

export const useResponseBody = () =>
  useNetworkStore((state) => state.responseBody);

export const useNetworkFilters = () =>
  useNetworkStore((state) => state.filters);

export const useNetworkSettings = () =>
  useNetworkStore((state) => state.settings);

export const useNetworkStats = () => useNetworkStore((state) => state.stats);

export const useIsRecording = () =>
  useNetworkStore((state) => state.isRecording);

export const useDebuggerAttached = () =>
  useNetworkStore((state) => state.debuggerAttached);
