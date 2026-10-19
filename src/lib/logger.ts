/**
 * Background logger.
 *
 * Production builds log warnings and errors only, so routine traffic (state
 * saves, per-message traces) doesn't retain large objects in the service
 * worker's console. Development builds log everything.
 */

import { createLogger } from '@arshad-shah/log-kit';
import { consoleTransport } from '@arshad-shah/log-kit/transports/console';

// Replaced at build time by extforge's esbuild `define`.
declare const process: { env: { NODE_ENV?: string } };

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  timestamp: 'epoch',
  transports: [consoleTransport({ pretty: true })],
});
