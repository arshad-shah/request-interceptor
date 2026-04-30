import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@/styles/global.css';

const container = document.getElementById('sidepanel-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}