/**
 * Interception state: enabled flag, routes and event-monitor flag, persisted
 * in chrome.storage.local. Every change is broadcast to extension pages and
 * content scripts.
 */
import { isWebSocketRoute, isInjectionRoute } from '@/core/route-keys';
import { validateHttpConfig, validateWebSocketConfig, validateInjectionConfig } from '@/core/route-validation';
import { migrateRoutes } from '@/core/route-migration';
import { exportRoutes } from '@/core/route-export';
import { findConflictingRoutes } from '@/core/route-conflicts';
import type { AnyRouteConfig, Routes, StateSnapshot } from '@/core/messaging/protocol';
import type { InjectionConfig, RouteConfig, WebSocketConfig } from '@/types';
import type { MessageRouter } from '@/core/messaging/router';
import { emit, emitToTabs } from '@/lib/messaging';
import { logger } from '@/lib/logger';
import { actionIconPaths } from '@/brand/mark';

const log = logger.child('state');

function isHttpRoute(route: string): boolean {
  return !isWebSocketRoute(route) && !isInjectionRoute(route);
}

export class StateStore {
  private state: StateSnapshot = { enabled: false, routes: {}, eventMonitorEnabled: false };

  /** Resolves once persisted state has loaded (also after a service-worker restart). */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  snapshot(): StateSnapshot {
    return structuredClone(this.state);
  }

  async load(): Promise<void> {
    try {
      const stored = (await chrome.storage.local.get(['enabled', 'routes', 'eventMonitorEnabled'])) as Partial<StateSnapshot>;
      this.state.enabled = stored.enabled === true;
      this.state.eventMonitorEnabled = stored.eventMonitorEnabled === true;
      const routes = stored.routes && typeof stored.routes === 'object' ? stored.routes : {};
      const migrated = migrateRoutes(routes as Parameters<typeof migrateRoutes>[0]);
      this.state.routes = migrated.routes as Routes;
      if (migrated.changed) {
        await this.save();
        log.info('Migrated routes');
      }
      this.updateIcon();
      log.debug('State loaded', { enabled: this.state.enabled, routes: Object.keys(this.state.routes).length });
    } catch (error) {
      // Start from defaults rather than leaving the extension unusable
      log.error('Error loading state; using defaults', { error: String(error) });
    }
  }

  private async save(): Promise<void> {
    try {
      await chrome.storage.local.set(this.state);
    } catch (error) {
      log.error('Error saving state', { error: String(error) });
      throw new Error('Could not save changes (storage unavailable or full)');
    }
  }

  private updateIcon(): void {
    chrome.action.setIcon({ path: actionIconPaths(this.state.enabled) }).catch((error: unknown) => {
      log.warn('setIcon failed', { error: String(error) });
    });
  }

  private broadcast(): void {
    const payload = { enabled: this.state.enabled, routes: this.state.routes };
    emit('STATE_CHANGED', payload);
    emitToTabs('STATE_CHANGED', payload);
  }

  /** Send current state to one tab's content script (e.g. after it loads). */
  sendToTab(tabId: number): void {
    emitToTabs('STATE_CHANGED', { enabled: this.state.enabled, routes: this.state.routes }, tabId);
    if (this.state.eventMonitorEnabled) emitToTabs('EVENT_MONITOR_CHANGED', { enabled: true }, tabId);
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.state.enabled = enabled;
    // The event monitor only runs while interception is on
    const monitorWasOn = this.state.eventMonitorEnabled;
    if (!enabled) this.state.eventMonitorEnabled = false;
    await this.save();
    this.updateIcon();
    this.broadcast();
    if (monitorWasOn && !enabled) {
      emit('EVENT_MONITOR_CHANGED', { enabled: false });
      emitToTabs('EVENT_MONITOR_CHANGED', { enabled: false });
    }
  }

  async setEventMonitor(enabled: boolean): Promise<void> {
    this.state.eventMonitorEnabled = enabled;
    await this.save();
    emit('EVENT_MONITOR_CHANGED', { enabled });
    emitToTabs('EVENT_MONITOR_CHANGED', { enabled });
  }

  async addRoute(route: string, input: AnyRouteConfig, name?: string): Promise<{ isUpdate: boolean }> {
    // Every field any route type may carry; defaults below are filled per route type
    const config = structuredClone(input) as Partial<RouteConfig & WebSocketConfig & InjectionConfig>;
    const validation = isWebSocketRoute(route)
      ? validateWebSocketConfig(config)
      : isInjectionRoute(route)
        ? validateInjectionConfig(config)
        : validateHttpConfig(config);
    if (!validation.valid) throw new Error(`Invalid route configuration: ${validation.error}`);

    if (isWebSocketRoute(route)) {
      config.incomingRules = config.incomingRules || [];
      config.outgoingRules = config.outgoingRules || [];
      config.delay = config.delay || 0;
      for (const rules of [config.incomingRules, config.outgoingRules]) {
        rules.forEach((rule: { id?: string }, index: number) => {
          rule.id ||= `rule-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
        });
      }
    } else if (isHttpRoute(route)) {
      config.responseHeaders = config.responseHeaders || {};
      config.requestHeaders = config.requestHeaders || {};
      config.removeRequestHeaders = config.removeRequestHeaders || [];
      config.headersOnly = config.headersOnly || false;
    }
    if (name) config.name = name;
    if (config.enabled === undefined) config.enabled = true;

    const isUpdate = Object.hasOwn(this.state.routes, route);
    if (isHttpRoute(route) && config.enabled) this.disableConflicts(route, isUpdate);

    this.state.routes[route] = config as AnyRouteConfig;
    await this.save();
    this.broadcast();
    return { isUpdate };
  }

  async removeRoute(route: string): Promise<void> {
    if (!this.state.routes[route]) throw new Error(`Route not found: ${route}`);
    delete this.state.routes[route];
    await this.save();
    this.broadcast();
  }

  async toggleRoute(route: string, enabled: boolean): Promise<void> {
    const config = this.state.routes[route] as (AnyRouteConfig & { enabled?: boolean }) | undefined;
    if (!config) throw new Error(`Route not found: ${route}`);
    if (isHttpRoute(route) && enabled) this.disableConflicts(route, false);
    config.enabled = enabled;
    await this.save();
    this.broadcast();
  }

  async clearRoutes(): Promise<void> {
    this.state.routes = {};
    await this.save();
    this.broadcast();
  }

  private disableConflicts(route: string, isUpdate: boolean): void {
    for (const key of findConflictingRoutes(route, this.state.routes as never, isUpdate)) {
      (this.state.routes[key] as { enabled?: boolean }).enabled = false;
      log.debug('Disabled conflicting route', { route: key });
    }
  }

  register(router: MessageRouter): void {
    router
      .on('GET_STATE', () => this.snapshot())
      .on('SET_ENABLED', ({ enabled }) => this.setEnabled(enabled))
      .on('ADD_ROUTE', ({ route, config, name }) => this.addRoute(route, config, name))
      .on('REMOVE_ROUTE', ({ route }) => this.removeRoute(route))
      .on('TOGGLE_ROUTE', ({ route, enabled }) => this.toggleRoute(route, enabled))
      .on('CLEAR_ROUTES', () => this.clearRoutes())
      .on('EXPORT_ROUTES', () => exportRoutes(this.state.routes as never))
      .on('SET_EVENT_MONITOR', ({ enabled }) => this.setEventMonitor(enabled));
  }
}
