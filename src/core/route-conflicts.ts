/**
 * Route conflict detection and resolution.
 */

import { isWebSocketRoute, isInjectionRoute } from './route-keys';

/**
 * Find conflicting route keys that should be disabled when enabling/adding a route.
 * Returns the set of route keys to disable.
 *
 * Conflict rules:
 * - Only applies to HTTP routes (WS and INJ routes don't conflict)
 * - A simple route (no name) disables all routes with the same method+url
 * - A named route disables only simple (unnamed) routes with the same method+url
 * - An update disables all routes with the same method+url
 */
export function findConflictingRoutes(
  routeKey: string,
  existingRoutes: Record<string, unknown>,
  isUpdate: boolean
): string[] {
  if (isWebSocketRoute(routeKey) || isInjectionRoute(routeKey)) {
    return [];
  }

  const [method, ...urlParts] = routeKey.split(':');
  const urlWithName = urlParts.join(':');
  const hasName = urlWithName.includes('|');
  const url = hasName ? urlWithName.split('|')[0] : urlWithName;

  const conflicts: string[] = [];

  for (const key of Object.keys(existingRoutes)) {
    if (isWebSocketRoute(key) || isInjectionRoute(key)) continue;
    if (key === routeKey) continue;

    const [otherMethod, ...otherUrlParts] = key.split(':');
    const otherUrlWithName = otherUrlParts.join(':');
    const otherHasName = otherUrlWithName.includes('|');
    const otherUrl = otherHasName ? otherUrlWithName.split('|')[0] : otherUrlWithName;

    if (otherUrl !== url || otherMethod !== method) continue;

    if (!hasName || isUpdate) {
      // Simple route or update: disable all conflicting
      conflicts.push(key);
    } else {
      // New named route: only disable simple (unnamed) routes
      if (!otherHasName) {
        conflicts.push(key);
      }
    }
  }

  return conflicts;
}
