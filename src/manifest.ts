import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AutoApply',
  version: '0.1.0',
  description: 'Auto-fill job application forms across major portals',
  permissions: ['activeTab', 'storage', 'sidePanel'],
  host_permissions: [
    'https://*.greenhouse.io/*',
    'https://*.lever.co/*',
    'https://*.wellfound.com/*',
    'https://*.startup.jobs/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
    },
  ],
  side_panel: {
    default_path: 'popup.html',
  },
  action: {
    default_title: 'AutoApply',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
});
