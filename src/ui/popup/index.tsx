// ExtForge's bundler emits react-refresh wrapper calls even in production builds.
// Defining these as no-ops before any component module evaluates prevents
// "$RefreshReg$ is not a function" at load time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
g.$RefreshReg$ ||= () => {};
g.$RefreshSig$ ||= () => (type: unknown) => type;

import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './popup';
import ErrorBoundary from '@/components/common/ErrorBoundary';

window.addEventListener('error', (e) => {
  console.error('[Popup] Uncaught error:', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Popup] Unhandled rejection:', e.reason);
});

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary scope="Popup">
      <Popup />
    </ErrorBoundary>
  );
}
