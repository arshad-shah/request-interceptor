// ExtForge's bundler emits react-refresh wrapper calls even in production builds.
// Defining these as no-ops before any component module evaluates prevents
// "$RefreshReg$ is not a function" at load time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
g.$RefreshReg$ ||= () => {};
g.$RefreshSig$ ||= () => (type: unknown) => type;

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from '@/components/common/ErrorBoundary';

window.addEventListener('error', (e) => {
  console.error('[SidePanel] Uncaught error:', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[SidePanel] Unhandled rejection:', e.reason);
});

const container = document.getElementById('sidepanel-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary scope="Side Panel">
      <App />
    </ErrorBoundary>
  );
}
