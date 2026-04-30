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
