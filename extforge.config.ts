import { defineConfig } from 'extforge';

export default defineConfig({
  browsers: ['chrome'],
  framework: 'react',
  css: 'tailwind',
  manifest: {
    manifestVersion: 3,
    name: 'Request Interceptor',
    version: '3.1.0',
    description: 'Developer toolkit for intercepting API responses, monitoring events, and inspecting browser storage',
    icons: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
      '512': 'icons/icon-512.png',
    },
    action: {
      defaultPopup: 'ui/popup/index.html',
      defaultIcon: {
        '16': 'icons/icon-16.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
        '512': 'icons/icon-512.png',
      },
    },
    background: { entrypoint: 'background/index.js' },
    contentScripts: [
      { matches: ['<all_urls>'], js: ['content/index.js'], runAt: 'document_start' },
    ],
    sidePanel: { defaultPath: 'ui/sidepanel/index.html' },
    permissions: {
      required: ['storage', 'activeTab', 'sidePanel', 'debugger', 'tabs', 'cookies', 'scripting'],
      optional: [],
      host: ['<all_urls>'],
    },
    webAccessibleResources: [
      { resources: ['injected.js'], matches: ['<all_urls>'] },
      { resources: ['icons/*'], matches: ['<all_urls>'] },
    ],
  },
});
