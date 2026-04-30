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
